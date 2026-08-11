"use client";

import { useEffect, useRef, useState } from "react";
import { sendAndConfirmTransaction } from "thirdweb";
import { mintWithSignature } from "thirdweb/extensions/erc721";
import { useActiveAccount, useConnectModal } from "thirdweb/react";
import {
  machineDreamsConnectTheme,
  machineDreamsWallets,
} from "@/app/components/wallet-connect-config";
import { formatTokenId } from "@/lib/format";
import { isArtworkMinted } from "@/lib/artworks";
import {
  getNftContract,
  etherscanTxUrl,
} from "@/lib/thirdweb-contract";
import {
  machineDreamsChain,
  thirdwebClient,
} from "@/lib/thirdweb-client";
import type { Artwork } from "@/lib/types";

/** Catalog plate type — match artwork-page-client exactly */
const EYEBROW =
  "font-serif text-[0.6875rem] uppercase tracking-[0.14em] text-[#666]";
const RULE = "border-t border-[#e5e5e5]";

const MINT_BTN =
  "shrink-0 bg-[#0a0a0a] px-5 py-2.5 font-serif text-[0.6875rem] uppercase tracking-[0.14em] text-white transition-opacity hover:opacity-80 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[#0a0a0a] disabled:cursor-not-allowed disabled:opacity-40";

const BIGINT_PAYLOAD_KEYS = new Set([
  "royaltyBps",
  "price",
  "pricePerToken",
  "quantity",
  "validityStartTimestamp",
  "validityEndTimestamp",
]);

type Eligibility = "idle" | "checking" | "eligible" | "ineligible" | "error";

type MintPhase =
  | "idle"
  | "generating"
  | "confirming"
  | "success"
  | "error";

/** On-chain claim status for this artwork's deterministic uid */
type ClaimStatus = "unknown" | "checking" | "available" | "minted";

function deserializeMintSignature(data: {
  payload: Record<string, string>;
  signature: string;
}) {
  const payload: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data.payload)) {
    payload[key] = BIGINT_PAYLOAD_KEYS.has(key) ? BigInt(value) : value;
  }
  return {
    payload,
    signature: data.signature as `0x${string}`,
  };
}

/** Pull the most useful string out of thirdweb / viem / RPC errors. */
function formatMintError(err: unknown): string {
  if (err == null) return "unknown_error";
  if (typeof err === "string") return err;

  const parts: string[] = [];
  const seen = new Set<unknown>();

  const walk = (value: unknown, depth: number) => {
    if (value == null || depth > 5 || seen.has(value)) return;
    if (typeof value === "string") {
      if (value) parts.push(value);
      return;
    }
    if (typeof value !== "object") {
      parts.push(String(value));
      return;
    }
    seen.add(value);
    const e = value as Record<string, unknown>;
    for (const key of [
      "shortMessage",
      "message",
      "reason",
      "details",
      "metaMessages",
    ]) {
      const v = e[key];
      if (typeof v === "string" && v) parts.push(v);
      if (Array.isArray(v)) {
        for (const item of v) {
          if (typeof item === "string" && item) parts.push(item);
        }
      }
    }
    if (e.code !== undefined && e.code !== null) {
      parts.push(`code: ${String(e.code)}`);
    }
    if (typeof e.data === "string" && e.data) {
      parts.push(`data: ${e.data}`);
    } else if (e.data && typeof e.data === "object") {
      walk(e.data, depth + 1);
    }
    if (e.cause) walk(e.cause, depth + 1);
  };

  walk(err, 0);

  const unique = [...new Set(parts.filter(Boolean))];
  if (unique.length === 0) {
    try {
      return JSON.stringify(serializeUnknown(err));
    } catch {
      return String(err);
    }
  }
  return unique.join(" · ");
}

function serializeUnknown(value: unknown, depth = 0): unknown {
  if (value == null) return value;
  if (typeof value === "bigint") return value.toString();
  if (typeof value !== "object") return value;
  if (depth > 5) return "[MaxDepth]";
  if (Array.isArray(value)) {
    return value.map((v) => serializeUnknown(v, depth + 1));
  }
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
      ...serializeUnknown({ ...value }, depth + 1) as object,
    };
  }
  const out: Record<string, unknown> = {};
  for (const key of Object.getOwnPropertyNames(value)) {
    try {
      out[key] = serializeUnknown(
        (value as Record<string, unknown>)[key],
        depth + 1
      );
    } catch {
      out[key] = "[Unserializable]";
    }
  }
  // Common non-enumerable fields on viem/thirdweb errors
  const e = value as Record<string, unknown>;
  for (const key of [
    "shortMessage",
    "message",
    "reason",
    "details",
    "code",
    "data",
    "cause",
    "metaMessages",
    "version",
    "docsPath",
  ]) {
    if (key in e && !(key in out)) {
      try {
        out[key] = serializeUnknown(e[key], depth + 1);
      } catch {
        out[key] = "[Unserializable]";
      }
    }
  }
  return out;
}

async function reportMintErrorToServer(payload: Record<string, unknown>) {
  const safe = serializeUnknown(payload) as Record<string, unknown>;
  console.error("[artwork-mint]", safe);
  try {
    await fetch("/api/mint-client-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safe),
    });
  } catch {
    // ignore logging failures
  }
}

/**
 * Catalog STATUS / MINT block — mainnet signature mint for this artwork's Normie.
 * Visual language matches the plate: eyebrow status, solid black Mint, no panels.
 */
export function OwnershipMintBlock({ artwork }: { artwork: Artwork }) {
  const account = useActiveAccount();
  const { connect } = useConnectModal();
  const tokenId = artwork.tokenId;
  const redisMinted = isArtworkMinted(artwork);

  const [eligibility, setEligibility] = useState<Eligibility>("idle");
  const [mintPhase, setMintPhase] = useState<MintPhase>("idle");
  const [claimStatus, setClaimStatus] = useState<ClaimStatus>(
    redisMinted ? "minted" : "unknown"
  );
  const [txHash, setTxHash] = useState<string | null>(
    artwork.mintTxHash ?? null
  );
  const [mintErrorDetail, setMintErrorDetail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const checkSeq = useRef(0);

  // Redis first; on-chain only when Redis does not already say minted
  useEffect(() => {
    if (redisMinted) {
      setClaimStatus("minted");
      return;
    }
    let cancelled = false;
    async function checkClaim() {
      setClaimStatus("checking");
      try {
        const res = await fetch("/api/check-minted", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tokenId }),
        });
        const data = (await res.json()) as {
          minted?: boolean;
          mintTxHash?: string | null;
        };
        if (cancelled) return;
        if (!res.ok) {
          setClaimStatus("unknown");
          return;
        }
        if (data.minted) {
          setClaimStatus("minted");
          if (data.mintTxHash) setTxHash(data.mintTxHash);
        } else {
          setClaimStatus("available");
        }
      } catch {
        if (!cancelled) setClaimStatus("unknown");
      }
    }
    void checkClaim();
    return () => {
      cancelled = true;
    };
  }, [tokenId, redisMinted]);

  // Auto-check eligibility when a wallet is connected (skip if already minted)
  useEffect(() => {
    if (redisMinted || claimStatus === "minted") return;
    if (!account?.address) {
      setEligibility("idle");
      return;
    }

    const seq = ++checkSeq.current;
    let cancelled = false;

    async function check() {
      setEligibility("checking");
      try {
        const res = await fetch("/api/check-ownership", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            walletAddress: account!.address,
            tokenId,
          }),
        });
        const data = (await res.json()) as { eligible?: boolean };
        if (cancelled || seq !== checkSeq.current) return;
        if (!res.ok) {
          setEligibility("error");
          return;
        }
        setEligibility(data.eligible ? "eligible" : "ineligible");
      } catch {
        if (cancelled || seq !== checkSeq.current) return;
        setEligibility("error");
      }
    }

    void check();
    return () => {
      cancelled = true;
    };
  }, [account?.address, tokenId, redisMinted, claimStatus]);

  async function persistMintToRedis(walletAddress: string, hash: string) {
    const payload = {
      tokenId,
      mintedBy: walletAddress,
      mintTxHash: hash,
    };

    async function attempt(): Promise<{
      ok: boolean;
      status?: number;
      detail?: string;
    }> {
      try {
        const res = await fetch("/api/record-mint", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) return { ok: true };
        const data = (await res.json().catch(() => null)) as {
          error?: string;
          message?: string;
        } | null;
        return {
          ok: false,
          status: res.status,
          detail:
            data?.error || data?.message || `record_mint_http_${res.status}`,
        };
      } catch (err) {
        return {
          ok: false,
          detail: err instanceof Error ? err.message : "network_error",
        };
      }
    }

    let result = await attempt();
    if (!result.ok) {
      await new Promise((resolve) => setTimeout(resolve, 750));
      result = await attempt();
    }

    // On-chain mint already succeeded — keep "Minted" UI; log for ops visibility
    if (!result.ok) {
      await reportMintErrorToServer({
        stage: "record-mint",
        message:
          "Mint succeeded on-chain but Redis persistence failed after retry",
        tokenId,
        walletAddress,
        mintTxHash: hash,
        httpStatus: result.status ?? null,
        detail: result.detail ?? "unknown",
      });
    }
  }

  function markAlreadyMinted() {
    setClaimStatus("minted");
    setMintPhase("success");
    setMintErrorDetail(null);
  }

  async function handleConnectAndMintClick() {
    if (busy || mintPhase === "success" || claimStatus === "minted") return;

    if (!account?.address) {
      try {
        await connect({
          client: thirdwebClient,
          chain: machineDreamsChain,
          chains: [machineDreamsChain],
          wallets: machineDreamsWallets,
          showAllWallets: false,
          theme: machineDreamsConnectTheme,
          size: "compact",
          title: "Connect wallet",
          titleIcon: "",
          showThirdwebBranding: false,
          appMetadata: {
            name: "Machine Dreams",
            description: "Art by awakened Normies",
          },
        });
      } catch {
        // User dismissed modal
      }
      return;
    }

    if (eligibility !== "eligible") return;
    await runMint();
  }

  async function runMint() {
    if (!account?.address || busy) return;
    setBusy(true);
    setMintPhase("generating");
    setMintErrorDetail(null);
    try {
      const res = await fetch("/api/generate-mint-signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: account.address,
          tokenId,
        }),
      });
      const data = (await res.json()) as {
        signedPayload?: {
          payload: Record<string, string>;
          signature: string;
        };
        message?: string;
        error?: string;
      };
      if (!res.ok || !data.signedPayload) {
        if (data.error === "already_minted" || res.status === 409) {
          markAlreadyMinted();
          setBusy(false);
          return;
        }
        const detail =
          data.message ||
          data.error ||
          `signature_http_${res.status}`;
        setMintErrorDetail(detail);
        setMintPhase("error");
        await reportMintErrorToServer({
          stage: "generate-mint-signature",
          tokenId,
          walletAddress: account.address,
          httpStatus: res.status,
          detail,
          response: data,
        });
        setBusy(false);
        return;
      }

      setMintPhase("confirming");
      const { payload, signature } = deserializeMintSignature(
        data.signedPayload
      );
      const contract = getNftContract();
      const transaction = mintWithSignature({
        contract,
        payload: payload as never,
        signature,
      });
      const receipt = await sendAndConfirmTransaction({
        account,
        transaction,
      });
      setTxHash(receipt.transactionHash);
      setClaimStatus("minted");
      setMintPhase("success");
      await persistMintToRedis(account.address, receipt.transactionHash);
    } catch (err) {
      const detail = formatMintError(err);
      // TokenERC721 surfaces used-uid as "invalid signature"
      if (/invalid signature/i.test(detail)) {
        markAlreadyMinted();
      } else {
        setMintErrorDetail(detail);
        setMintPhase("error");
        await reportMintErrorToServer({
          stage: "sendAndConfirmTransaction",
          tokenId,
          walletAddress: account.address,
          detail,
          error: serializeUnknown(err),
        });
      }
    } finally {
      setBusy(false);
    }
  }

  const showMinted =
    redisMinted || claimStatus === "minted" || mintPhase === "success";

  // —— Already minted (Redis, on-chain reconcile, or this session) ——
  if (showMinted) {
    const hash = txHash ?? artwork.mintTxHash ?? null;
    return (
      <section aria-label="Ownership" className={`${RULE} pt-8`}>
        <div className="flex flex-col gap-3">
          <p className={EYEBROW}>
            Minted
            {hash ? (
              <>
                {" · "}
                <a
                  href={etherscanTxUrl(hash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-[#ccc] underline-offset-4 transition-colors hover:text-[#0a0a0a] hover:decoration-[#0a0a0a]/40"
                >
                  View on Etherscan
                </a>
              </>
            ) : null}
          </p>
        </div>
      </section>
    );
  }

  // —— Connected but wrong wallet: quiet caption, no Mint ——
  if (account?.address && eligibility === "ineligible") {
    return (
      <section aria-label="Mint" className={`${RULE} pt-8`}>
        <p className={EYEBROW}>
          This wallet does not hold Normie {formatTokenId(tokenId)}
        </p>
      </section>
    );
  }

  const statusLine = (() => {
    if (claimStatus === "checking") return "Checking mint status…";
    if (mintPhase === "generating") return "Generating permission…";
    if (mintPhase === "confirming") return "Awaiting confirmation…";
    if (mintPhase === "error") {
      return mintErrorDetail
        ? `Mint failed · ${mintErrorDetail}`
        : "Mint failed · Try again";
    }
    if (eligibility === "checking") return "Checking eligibility…";
    if (eligibility === "error") return "Could not verify ownership";
    if (!account?.address) return "Connect wallet to check eligibility";
    if (eligibility === "eligible") return "Not minted · Eligible to mint";
    return "Connect wallet to check eligibility";
  })();

  const showMintButton =
    claimStatus !== "checking" &&
    (!account?.address ||
      eligibility === "eligible" ||
      mintPhase === "error");

  const mintDisabled =
    busy ||
    claimStatus === "checking" ||
    eligibility === "checking" ||
    (Boolean(account?.address) &&
      eligibility !== "eligible" &&
      mintPhase !== "error");

  return (
    <section aria-label="Mint" className={`${RULE} pt-8`}>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-6">
          <p
            className={`${EYEBROW} ${
              mintPhase === "error"
                ? "max-w-[18rem] break-words text-[#a33] normal-case tracking-normal"
                : ""
            }`}
          >
            {statusLine}
          </p>
          {showMintButton ? (
            <button
              type="button"
              onClick={handleConnectAndMintClick}
              disabled={mintDisabled}
              className={MINT_BTN}
            >
              Mint
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
