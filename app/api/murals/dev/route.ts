/**
 * TEMPORARY. Dev-only mural generation. Do not expose in production.
 */
import { NextResponse } from "next/server";
import { anthropic, generateImage, parseClaudeJson } from "@/lib/ai";
import {
  formatSeasonRecord,
  pickDummySeason,
} from "@/lib/arena-murals-dummy";

export const maxDuration = 120;

const MURAL_BRIEF = `You are making the one mural that records an entire season of a world called the Arena, where AI-agent Normies live, fight, trade, vote, and die. Below is the record of the season. Make the mural a community would make to remember it.

Rules:
- Choose ONE specific physical medium that fits what happened (fresco, woodblock print, tile mosaic, stencil on a wall, embroidered banner, carved relief). Name it precisely, with its surface, material, and wear.
- It is an artifact made after the season, not a depiction of the battle. Aftermath, record, or memorial rather than spectacle.
- No fantasy illustration, no glowing swords, no cinematic lighting, no epic battle scenes, no digital-art or 3D-render look.
- Wide mural composition. Specific details drawn from the data (names, numbers, events), not generic symbols.
- Don't mention that it's AI-made or a render.
Respond with JSON only: {"title": "3-6 words", "medium": "...", "imagePrompt": "...", "statement": "2-3 sentences"}`;

type MuralBrief = {
  title: string;
  medium: string;
  imagePrompt: string;
  statement: string;
};

function parseBrief(text: string): MuralBrief | null {
  let parsed: {
    title?: unknown;
    medium?: unknown;
    imagePrompt?: unknown;
    statement?: unknown;
  };
  try {
    parsed = parseClaudeJson(text);
  } catch {
    return null;
  }
  const title =
    typeof parsed.title === "string" ? parsed.title.trim().replace(/\s+/g, " ") : "";
  const medium =
    typeof parsed.medium === "string"
      ? parsed.medium.trim().replace(/\s+/g, " ")
      : "";
  const imagePrompt =
    typeof parsed.imagePrompt === "string"
      ? parsed.imagePrompt.trim().replace(/\s+/g, " ")
      : "";
  const statement =
    typeof parsed.statement === "string"
      ? parsed.statement.trim().replace(/\s+/g, " ")
      : "";
  if (!title || !medium || !imagePrompt || !statement) return null;
  return { title, medium, imagePrompt, statement };
}

export async function POST() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  try {
    const season = pickDummySeason();
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `${MURAL_BRIEF}\n\nSEASON DATA:\n${formatSeasonRecord(season)}`,
        },
      ],
    });
    const block = message.content.find((part) => part.type === "text");
    const text = block && block.type === "text" ? block.text : "";
    const brief = parseBrief(text);
    if (!brief) {
      return NextResponse.json(
        { ok: false, message: "The mural brief could not be read. Try again." },
        { status: 200 }
      );
    }

    const imageUrl = await generateImage(brief.imagePrompt, {
      aspectRatio: "16:9",
    });
    const fetched = await fetch(imageUrl);
    if (!fetched.ok) {
      return NextResponse.json(
        { ok: false, message: "The mural image could not be drawn. Try again." },
        { status: 200 }
      );
    }
    const bytes = Buffer.from(await fetched.arrayBuffer());
    const contentType = fetched.headers.get("content-type") ?? "image/webp";
    const imageDataUrl = `data:${contentType};base64,${bytes.toString("base64")}`;

    return NextResponse.json({
      ok: true,
      seasonName: season.name,
      title: brief.title,
      medium: brief.medium,
      statement: brief.statement,
      imageDataUrl,
    });
  } catch {
    return NextResponse.json(
      { ok: false, message: "This mural couldn't be drawn right now. Please try again." },
      { status: 200 }
    );
  }
}
