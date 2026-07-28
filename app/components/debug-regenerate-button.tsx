"use client";

import { useState } from "react";
import { ARTWORK_CREATION_USER_MESSAGE } from "@/lib/artwork-creation-messages";
import { TYPE } from "@/lib/typography";

/** Owner-only debug token for end-to-end regenerate → reveal testing. */
const DEBUG_TOKEN_ID = "9445";

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

/**
 * Temporary owner testing control — only renders for token 9445 when
 * `?debugRegenerate=true` is present. Calls the real /api/create regenerate
 * path (same as ExpiredRightColumn), then redirects into the justCreated reveal.
 */
export function DebugRegenerateButton({ tokenId }: { tokenId: string }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  if (tokenId !== DEBUG_TOKEN_ID) return null;

  async function handleRegenerate() {
    setBusy(true);
    setFailed(false);
    try {
      const res = await fetch("/api/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenId: DEBUG_TOKEN_ID, regenerate: true }),
      });
      const contentType = res.headers.get("content-type") ?? "";
      if (!res.ok) {
        setFailed(true);
        setBusy(false);
        return;
      }
      if (contentType.includes("text/event-stream")) {
        await consumeSSE(res, (event) => {
          if (event.type === "error") {
            throw new Error("creation_failed");
          }
        });
      }
      window.location.assign(
        `/artwork/${DEBUG_TOKEN_ID}?justCreated=true`
      );
    } catch {
      setFailed(true);
      setBusy(false);
    }
  }

  return (
    <div className="border-b border-dashed border-[#ccc] bg-[#fff8e8] px-6 py-3">
      <div className="mx-auto flex max-w-md flex-col gap-2">
        <p className="font-serif text-[0.6875rem] uppercase tracking-[0.14em] text-[#996600]">
          Debug — owner regenerate (9445 only)
        </p>
        <button
          type="button"
          onClick={handleRegenerate}
          disabled={busy}
          className="btn-nav self-start text-xs disabled:opacity-40"
        >
          {busy ? "Regenerating…" : "Regenerate → reveal"}
        </button>
        {failed ? (
          <p className={TYPE.statusError}>{ARTWORK_CREATION_USER_MESSAGE}</p>
        ) : null}
      </div>
    </div>
  );
}
