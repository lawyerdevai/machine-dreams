"use client";

import { useState } from "react";
import { TestCreateReveal } from "@/app/components/test-create-reveal";
import { TYPE } from "@/lib/typography";
import type { Artwork } from "@/lib/types";

async function consumeSSE(
  response: Response,
  onEvent: (data: Record<string, string | boolean | null>) => void
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

type PreviewState = {
  artwork: Artwork;
  aboutBio: string | null;
};

export function TestCreateClient() {
  const [tokenInput, setTokenInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewState | null>(null);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = tokenInput.trim();
    setError(null);
    setPreview(null);
    setStatus(null);

    if (!/^\d+$/.test(trimmed) || Number(trimmed) < 0 || Number(trimmed) > 9999) {
      setError("enter a valid token id (0–9999).");
      return;
    }

    setLoading(true);
    setStatus("checking agent…");

    try {
      const checkRes = await fetch("/api/check-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenId: trimmed }),
      });
      const check = await checkRes.json();

      if (!check.awakened) {
        setError("that token is not awakened — pick a real awakened normie.");
        setLoading(false);
        setStatus(null);
        return;
      }

      setStatus("generating (not saved)…");

      const res = await fetch("/api/test-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenId: trimmed }),
      });

      if (res.status === 404) {
        setError("that token is not awakened — pick a real awakened normie.");
        setLoading(false);
        setStatus(null);
        return;
      }

      if (!res.ok) {
        setError("generation failed. try again.");
        setLoading(false);
        setStatus(null);
        return;
      }

      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("text/event-stream")) {
        setError("unexpected response from test create.");
        setLoading(false);
        setStatus(null);
        return;
      }

      let gotComplete = false;
      await consumeSSE(res, (event) => {
        if (event.type === "complete") {
          gotComplete = true;
          const artwork: Artwork = {
            tokenId: String(event.tokenId ?? trimmed),
            agentName: String(event.agentName ?? check.name ?? ""),
            title: String(event.title ?? ""),
            artistStatement: String(event.artistStatement ?? ""),
            imageUrl: String(event.imageUrl ?? ""),
            createdAt: String(event.createdAt ?? new Date().toISOString()),
            mintedAt: null,
          };
          setPreview({
            artwork,
            aboutBio:
              typeof event.aboutBio === "string" && event.aboutBio
                ? event.aboutBio
                : null,
          });
          setStatus(null);
        } else if (event.type === "error") {
          setError(
            event.code === "agent_not_found"
              ? "agent not found."
              : "generation failed. try again."
          );
          setStatus(null);
        }
      });

      if (!gotComplete && !error) {
        // SSE closed without complete — leave error if not already set
      }
    } catch {
      setError("something went wrong. try again.");
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b border-[#e5e5e5] bg-[#f7f7f5] px-6 py-3">
        <p className="font-serif text-[0.6875rem] uppercase tracking-[0.14em] text-[#666]">
          Test mode — not saved · never writes to redis
        </p>
      </div>

      <div className="mx-auto w-full max-w-md px-6 py-8">
        <form onSubmit={handleGenerate} className="flex flex-col gap-4">
          <label className="flex flex-col gap-2">
            <span className="font-serif text-[0.6875rem] uppercase tracking-[0.14em] text-[#666]">
              Token ID
            </span>
            <input
              type="text"
              inputMode="numeric"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="e.g. 7939"
              disabled={loading}
              className={TYPE.input}
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="btn-nav self-start bg-[#0a0a0a] text-white disabled:opacity-40"
          >
            {loading ? "Generating…" : "Generate"}
          </button>
          {status ? <p className={TYPE.status}>{status}</p> : null}
          {error ? <p className={TYPE.statusError}>{error}</p> : null}
        </form>
      </div>

      {preview ? (
        <TestCreateReveal
          key={`${preview.artwork.tokenId}-${preview.artwork.createdAt}`}
          artwork={preview.artwork}
          aboutBio={preview.aboutBio}
        />
      ) : null}
    </div>
  );
}
