"use client";

import { useState } from "react";
import { sendAndConfirmTransaction } from "thirdweb";
import { mintWithSignature } from "thirdweb/extensions/erc721";
import { useActiveAccount } from "thirdweb/react";
import { ConnectWalletButton } from "@/app/components/connect-wallet-button";
import { getNftContract, etherscanTxUrl } from "@/lib/thirdweb-contract";
import { TYPE } from "@/lib/typography";

type CheckResult =
  | { kind: "eligible"; tokenId: string }
  | { kind: "ineligible"; tokenId: string }
  | { kind: "error"; message: string };

type MintStatus =
  | { kind: "idle" }
  | { kind: "generating" }
  | { kind: "confirming" }
  | { kind: "success"; txHash: string }
  | { kind: "error"; message: string };

const BIGINT_PAYLOAD_KEYS = new Set([
  "royaltyBps",
  "price",
  "pricePerToken",
  "quantity",
  "validityStartTimestamp",
  "validityEndTimestamp",
]);

function deserializeMintSignature(data: {
  payload: Record<string, string>;
  signature: string;
}) {
  const payload: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data.payload)) {
    payload[key] = BIGINT_PAYLOAD_KEYS.has(key) ? BigInt(value) : value;
  }
  return {
    payload: payload as Parameters<typeof mintWithSignature>[0]["payload"],
    signature: data.signature as `0x${string}`,
  };
}

/**
 * Isolated mint harness — ownership check + mainnet signature mint.
 * APIs run only on explicit button clicks (never on load / connect).
 */
export function TestMintCheckClient() {
  const account = useActiveAccount();
  const [tokenId, setTokenId] = useState("9445");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [mintStatus, setMintStatus] = useState<MintStatus>({ kind: "idle" });

  async function handleCheck() {
    if (!account?.address || busy) return;
    const id = tokenId.trim();
    if (!id) {
      setResult({ kind: "error", message: "Enter a token ID" });
      return;
    }

    setBusy(true);
    setResult(null);
    setMintStatus({ kind: "idle" });
    try {
      const res = await fetch("/api/check-ownership", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: account.address,
          tokenId: id,
        }),
      });
      const data = (await res.json()) as {
        eligible?: boolean;
        error?: string;
      };
      if (!res.ok) {
        setResult({
          kind: "error",
          message: data.error ?? "check_failed",
        });
        return;
      }
      setResult(
        data.eligible
          ? { kind: "eligible", tokenId: id }
          : { kind: "ineligible", tokenId: id }
      );
    } catch {
      setResult({ kind: "error", message: "request_failed" });
    } finally {
      setBusy(false);
    }
  }

  async function handleMint() {
    if (!account?.address || busy || result?.kind !== "eligible") return;

    setBusy(true);
    setMintStatus({ kind: "generating" });
    try {
      const res = await fetch("/api/generate-mint-signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: account.address,
          tokenId: result.tokenId,
        }),
      });
      const data = (await res.json()) as {
        signedPayload?: {
          payload: Record<string, string>;
          signature: string;
        };
        error?: string;
        message?: string;
      };
      if (!res.ok || !data.signedPayload) {
        setMintStatus({
          kind: "error",
          message: data.message ?? data.error ?? "signature_failed",
        });
        return;
      }

      setMintStatus({ kind: "confirming" });
      const { payload, signature } = deserializeMintSignature(
        data.signedPayload
      );
      const contract = getNftContract();
      const transaction = mintWithSignature({
        contract,
        // Payload shape is TokenERC721 v1 or v2; restored from JSON strings.
        payload: payload as never,
        signature,
      });
      const receipt = await sendAndConfirmTransaction({
        account,
        transaction,
      });

      setMintStatus({
        kind: "success",
        txHash: receipt.transactionHash,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "mint_transaction_failed";
      setMintStatus({ kind: "error", message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-8 px-6 py-12">
      <div className="flex flex-col gap-2">
        <p className={TYPE.sectionLabel}>Test — mint eligibility + mainnet mint</p>
        <p className={`${TYPE.proseSm} text-[#666]`}>
          Connect a wallet, verify Normie ownership, then mint on Ethereum with a
          signed payload. Calls run only on button click.
        </p>
      </div>

      <ConnectWalletButton />

      {account?.address ? (
        <div className="flex flex-col gap-4">
          <p className={`${TYPE.metadata} break-all text-[#666]`}>
            Connected: {account.address}
          </p>

          <label className="flex flex-col gap-2">
            <span className={TYPE.sectionLabel}>Token ID</span>
            <input
              type="text"
              inputMode="numeric"
              value={tokenId}
              onChange={(e) => {
                setTokenId(e.target.value);
                setResult(null);
                setMintStatus({ kind: "idle" });
              }}
              className={TYPE.input}
              placeholder="9445"
            />
          </label>

          <button
            type="button"
            onClick={handleCheck}
            disabled={busy}
            className="btn-nav self-start disabled:opacity-40"
          >
            {busy && result === null && mintStatus.kind === "idle"
              ? "Checking…"
              : "Check Eligibility"}
          </button>

          {result?.kind === "eligible" ? (
            <p className={`${TYPE.status} text-[#0a0a0a]`}>
              ELIGIBLE — this wallet holds Normie #{result.tokenId}
            </p>
          ) : null}
          {result?.kind === "ineligible" ? (
            <p className={`${TYPE.status} text-[#666]`}>
              NOT ELIGIBLE — this wallet does not hold Normie #{result.tokenId}
            </p>
          ) : null}
          {result?.kind === "error" ? (
            <p className={TYPE.statusError}>{result.message}</p>
          ) : null}

          {result?.kind === "eligible" ? (
            <div className="flex flex-col gap-3 border-t border-[#e5e5e5] pt-4">
              <button
                type="button"
                onClick={handleMint}
                disabled={busy}
                className="btn-nav self-start disabled:opacity-40"
              >
                Mint Now
              </button>

              {mintStatus.kind === "generating" ? (
                <p className={TYPE.status}>Generating permission…</p>
              ) : null}
              {mintStatus.kind === "confirming" ? (
                <p className={TYPE.status}>Waiting for wallet confirmation…</p>
              ) : null}
              {mintStatus.kind === "success" ? (
                <p className={`${TYPE.status} text-[#0a0a0a]`}>
                  Minted! View transaction:{" "}
                  <a
                    href={etherscanTxUrl(mintStatus.txHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2"
                  >
                    Etherscan
                  </a>
                </p>
              ) : null}
              {mintStatus.kind === "error" ? (
                <p className={TYPE.statusError}>{mintStatus.message}</p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : (
        <p className={`${TYPE.metadata} text-[#999]`}>
          Connect a wallet to check eligibility.
        </p>
      )}
    </div>
  );
}
