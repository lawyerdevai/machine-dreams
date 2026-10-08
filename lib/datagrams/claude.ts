import { systemPrompt } from "./prompt";
import { lintScene } from "./lint";

const MODEL = process.env.DATAGRAMS_MODEL || "claude-opus-5-5";

async function call(messages: { role: "user" | "assistant"; content: string }[]): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY || "",
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({ model: MODEL, max_tokens: 16000, system: systemPrompt(), messages }),
  });
  if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const j = await res.json();
  return (j.content || []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
}

/** Ask Claude for the scene file; if the lint rejects it, tell Claude why and ask again (max 3 tries). */
export async function writeScene(userPrompt: string): Promise<{ scene: string; title: string; model: string; attempts: number }> {
  const msgs: { role: "user" | "assistant"; content: string }[] = [{ role: "user", content: userPrompt }];
  let lastReason = "";
  for (let attempt = 1; attempt <= 3; attempt++) {
    const out = await call(msgs);
    const r = lintScene(out);
    if (r.ok) return { scene: r.scene, title: r.title, model: MODEL, attempts: attempt };
    lastReason = r.reason;
    msgs.push({ role: "assistant", content: out });
    msgs.push({ role: "user", content: `That file was rejected: ${r.reason}. Write the complete scene file again, fixing that. Output only the file.` });
  }
  throw new Error("Claude did not produce a valid scene file: " + lastReason);
}
