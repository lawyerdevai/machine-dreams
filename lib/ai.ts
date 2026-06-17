import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import Replicate from "replicate";

export const anthropic = new Anthropic();
export const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

export function parseClaudeJson<T>(text: string): T {
  console.log("[claude] raw response:", text);

  let cleaned = text.trim();
  const fenced = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced) {
    cleaned = fenced[1].trim();
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/, "")
      .trim();
  }

  return JSON.parse(cleaned) as T;
}

export function extractImageUrl(output: unknown): string {
  if (typeof output === "string") return output;
  if (Array.isArray(output)) return extractImageUrl(output[0]);
  if (output && typeof output === "object" && "url" in output) {
    const url = (output as { url: unknown }).url;
    return typeof url === "function" ? url.call(output) : String(url);
  }
  return String(output);
}

export async function generateImage(prompt: string): Promise<string> {
  const output = await replicate.run("black-forest-labs/flux-1.1-pro", {
    input: {
      prompt,
      aspect_ratio: "1:1",
      output_format: "webp",
      output_quality: 90,
    },
  });
  return extractImageUrl(output);
}

export function sseEvent(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}
