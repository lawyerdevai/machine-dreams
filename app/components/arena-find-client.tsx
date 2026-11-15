"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActiveAccount, useConnectModal } from "thirdweb/react";
import { AgentName, TokenId } from "@/app/components/typography";
import { machineDreamsChain, thirdwebClient } from "@/lib/thirdweb-client";
import {
  machineDreamsConnectTheme,
  machineDreamsWallets,
} from "@/app/components/wallet-connect-config";
import { agentImageUrl } from "@/lib/normies";
import { arenaPiecePath, buildArenaCreateMessage } from "@/lib/routes";
import { TYPE } from "@/lib/typography";

type Feedback = { message: string; tone: "error" | "info" } | null;

type ListedNormie = {
  tokenId: string;
  name: string;
  type: string;
  hasPortrait: boolean;
};

type ReadyToDraw = {
  tokenId: string;
  name: string;
  type: string;
};

function timestamp() {
  return Date.now();
}

function isValidWalletAddress(value: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(value.trim());
}

function isValidTokenId(value: string) {
  if (!/^\d+$/.test(value.trim())) return false;
  const n = Number(value.trim());
  return n >= 0 && n <= 9999;
}

async function consumeSSE(
  response: Response,
  onEvent: (data: Record<string, string | boolean>) => void
) {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      const line = part.trim();
      if (line.startsWith("data: ")) {
        onEvent(JSON.parse(line.slice(6)));
      }
    }
  }
}

function FeedbackMessage({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null;
  return (
    <p
      className={`text-center ${
        feedback.tone === "error" ? TYPE.statusError : TYPE.status
      }`}
    >
      {feedback.message}
    </p>
  );
}

function DrawingStatus({
  startedAt,
  done,
}: {
  startedAt: number;
  done: boolean;
}) {
  const [now, setNow] = useState(startedAt);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, []);

  const elapsedSec = Math.max(0, (now - startedAt) / 1000);
  const pct = done ? 100 : 90 * (1 - Math.exp(-elapsedSec / 25));
  const shown = Math.floor(elapsedSec);

  return (
    <div className="flex w-full flex-col gap-2" aria-live="polite">
      <div className="h-0.5 w-full bg-[#e4dcc8]">
        <div
          className="h-full bg-[#15120f] transition-[width] duration-200"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className={`${TYPE.proseSm} text-center italic text-[#15120f]`}>
        {shown > 90
          ? `Still drawing… ${shown}s`
          : `Drawing… ${shown}s`}
      </p>
    </div>
  );
}

export function ArenaFindClient({
  allowRegenerate = false,
  initialTokenId = "",
}: {
  allowRegenerate?: boolean;
  initialTokenId?: string;
}) {
  const router = useRouter();
  const account = useActiveAccount();
  const { connect } = useConnectModal();
  const [address, setAddress] = useState("");
  const [tokenId, setTokenId] = useState(initialTokenId);
  const [walletLoading, setWalletLoading] = useState(false);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [drawDone, setDrawDone] = useState(false);
  const [walletFeedback, setWalletFeedback] = useState<Feedback>(null);
  const [tokenFeedback, setTokenFeedback] = useState<Feedback>(null);
  const [normies, setNormies] = useState<ListedNormie[]>([]);
  const [ready, setReady] = useState<ReadyToDraw | null>(null);

  const busy = walletLoading || tokenLoading || drawing;

  async function ensureWallet() {
    if (account) return account;
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
    return null;
  }

  async function draw(targetId: string) {
    setTokenFeedback(null);
    const active = account ?? (await ensureWallet());
    if (!active) {
      setTokenFeedback({
        tone: "info",
        message: "Wallet connected. Press Draw again to sign.",
      });
      return;
    }

    setDrawing(true);
    setDrawDone(false);
    setStartedAt(timestamp());

    try {
      const issuedAt = timestamp();
      const message = buildArenaCreateMessage(targetId, issuedAt);
      const signature = await active.signMessage({ message });
      const res = await fetch("/api/arena/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tokenId: targetId,
          walletAddress: active.address,
          message,
          signature,
          regenerate: allowRegenerate,
        }),
      });

      const contentType = res.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        const data = (await res.json()) as {
          message?: string;
          imageUrl?: string;
          alreadyExisted?: boolean;
        };
        if (!res.ok || !data.imageUrl) {
          setTokenFeedback({
            tone: "error",
            message:
              data.message ??
              "This portrait couldn't be drawn right now. Please try again in a moment.",
          });
          setDrawing(false);
          setStartedAt(null);
          return;
        }
        setDrawDone(true);
        window.setTimeout(() => {
          router.push(arenaPiecePath(targetId));
        }, 300);
        return;
      }

      let failed = false;
      let existed = false;
      await consumeSSE(res, (event) => {
        if (event.type === "error") {
          failed = true;
          setTokenFeedback({
            tone: "error",
            message:
              typeof event.message === "string"
                ? event.message
                : "This portrait couldn't be drawn right now. Please try again in a moment.",
          });
        } else if (event.type === "complete") {
          existed = event.alreadyExisted === true;
        }
      });

      if (failed) {
        setDrawing(false);
        setStartedAt(null);
        return;
      }

      setDrawDone(true);
      window.setTimeout(() => {
        window.location.assign(
          existed
            ? arenaPiecePath(targetId)
            : `${arenaPiecePath(targetId)}?justCreated=true`
        );
      }, 300);
    } catch {
      setTokenFeedback({
        tone: "error",
        message: "The signature was dismissed, or the drawing could not start. Try again.",
      });
      setDrawing(false);
      setStartedAt(null);
    }
  }

  async function handleWalletSearch(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = address.trim();
    if (!trimmed || busy) return;

    setWalletLoading(true);
    setWalletFeedback(null);
    setNormies([]);

    if (!isValidWalletAddress(trimmed)) {
      setWalletFeedback({
        tone: "error",
        message:
          "That doesn't look like a valid Ethereum address. Try 0x followed by 40 hex characters.",
      });
      setWalletLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/arena/holders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setWalletFeedback({
          tone: "error",
          message:
            data.message ??
            "Something went wrong looking up that wallet. Please try again.",
        });
        return;
      }
      const listed: ListedNormie[] = data.normies ?? [];
      if (listed.length === 0) {
        setWalletFeedback({
          tone: "info",
          message: "This wallet is valid, but none of its Normies have awakened yet.",
        });
        return;
      }
      setNormies(listed);
    } catch {
      setWalletFeedback({
        tone: "error",
        message: "Something went wrong looking up that wallet. Please try again.",
      });
    } finally {
      setWalletLoading(false);
    }
  }

  async function handleTokenGo(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = tokenId.trim();
    if (!trimmed || busy) return;

    setTokenLoading(true);
    setTokenFeedback(null);
    setReady(null);

    if (!isValidTokenId(trimmed)) {
      setTokenFeedback({
        tone: "error",
        message: "Enter a Normie number between 0 and 9999.",
      });
      setTokenLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/arena/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenId: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTokenFeedback({
          tone: "error",
          message: data.message ?? "Something went wrong checking that Normie. Please try again.",
        });
        return;
      }
      if (!data.awakened) {
        setTokenFeedback({
          tone: "info",
          message:
            "This Normie has not awakened yet. Check the number, or wait until it has.",
        });
        return;
      }
      if (data.hasPortrait && !allowRegenerate) {
        router.push(arenaPiecePath(trimmed));
        return;
      }
      setReady({
        tokenId: trimmed,
        name: data.name ?? `Normie #${trimmed}`,
        type: data.type ?? "",
      });
    } catch {
      setTokenFeedback({
        tone: "error",
        message: "Something went wrong checking that Normie. Please try again.",
      });
    } finally {
      setTokenLoading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-10">
      <form onSubmit={handleWalletSearch} className="flex w-full flex-col gap-4">
        <input
          type="text"
          value={address}
          onChange={(e) => {
            setAddress(e.target.value);
            if (walletFeedback) setWalletFeedback(null);
          }}
          placeholder="wallet address"
          disabled={drawing}
          className={`${TYPE.input} bg-[#f2ead8]`}
        />
        <button
          type="submit"
          disabled={busy}
          className="btn-minimal w-full disabled:opacity-40"
        >
          {walletLoading ? "Searching…" : "Search"}
        </button>
        <FeedbackMessage feedback={walletFeedback} />
      </form>

      {normies.length > 0 && !drawing ? (
        <div className="grid w-full grid-cols-3 gap-6 pt-2">
          {normies.map((normie) => (
            <div key={normie.tokenId} className="flex flex-col gap-2">
              {normie.hasPortrait ? (
                <Link
                  href={arenaPiecePath(normie.tokenId)}
                  className="flex flex-col gap-2 transition-opacity hover:opacity-80"
                >
                  {/* Normie portraits are SVG; next/image cannot optimize them. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={agentImageUrl(normie.tokenId)}
                    alt=""
                    className="aspect-square w-full bg-[#f2ead8] object-cover"
                  />
                  <AgentName name={normie.name} />
                  <TokenId tokenId={normie.tokenId} />
                  <span className="font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-[#15120f]">
                    View
                  </span>
                </Link>
              ) : (
                <>
                  {/* Normie portraits are SVG; next/image cannot optimize them. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={agentImageUrl(normie.tokenId)}
                    alt=""
                    className="aspect-square w-full bg-[#f2ead8] object-cover"
                  />
                  <AgentName name={normie.name} />
                  <TokenId tokenId={normie.tokenId} />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => draw(normie.tokenId)}
                    className="btn-minimal px-2 py-1 text-xs disabled:opacity-40"
                  >
                    Draw
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      ) : null}

      <div className="relative flex w-full items-center">
        <div className="h-px w-full bg-[#15120f]" />
        <span className="absolute left-1/2 -translate-x-1/2 bg-[#f2ead8] px-3 font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-[#666]">
          or
        </span>
      </div>

      <form onSubmit={handleTokenGo} className="flex w-full flex-col gap-4">
        <input
          type="text"
          value={tokenId}
          onChange={(e) => {
            setTokenId(e.target.value);
            if (tokenFeedback) setTokenFeedback(null);
            if (ready) setReady(null);
          }}
          placeholder="token id"
          disabled={drawing}
          className={`${TYPE.input} bg-[#f2ead8]`}
        />
        <button
          type="submit"
          disabled={busy}
          className="btn-minimal w-full disabled:opacity-40"
        >
          {tokenLoading ? "Checking…" : "Go"}
        </button>
        {ready && !drawing ? (
          <div className="flex flex-col items-center gap-3">
            <p className="text-center font-serif text-[#15120f]">
              {ready.name} is ready.
            </p>
            <button
              type="button"
              onClick={() => draw(ready.tokenId)}
              className="btn-minimal"
            >
              Draw
            </button>
          </div>
        ) : null}
        {drawing && startedAt ? (
          <DrawingStatus startedAt={startedAt} done={drawDone} />
        ) : null}
        <FeedbackMessage feedback={tokenFeedback} />
      </form>
    </div>
  );
}
