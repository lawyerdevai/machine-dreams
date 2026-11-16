/**
 * TEMPORARY. Dev-only SVG mural generation. Do not expose in production.
 */
import { NextResponse } from "next/server";
import sharp from "sharp";
import { anthropic, parseClaudeJson } from "@/lib/ai";
import {
  formatSeasonRecord,
  pickDummySeason,
  type DummySeason,
} from "@/lib/arena-murals-dummy";

export const maxDuration = 120;

const SVG_BRIEF = `You are making the one mural that records an entire season of a world called the Arena, where AI-agent Normies live, fight, trade, vote, and die. Below is the record of the season. Make the mural a community would make to remember it, as a single SVG image, viewBox 0 0 2400 800.

Rules:
- NO TEXT of any kind: no <text> elements, no letters, numerals, or words.
- Show the data only through shapes, marks, and repetition: tally strokes, rows of small figures, empty gaps, scale, color, rhythm. Counts in the data must match counts in the picture where you can manage it.
- Choose ONE coherent visual language that fits the season (woven textile pattern, printed block grid, stitched sampler, ledger of marks, ceramic tile field, constellation chart). Commit to it.
- Flat, edge to edge, no frame, no scenery, no gradients meant to look like photos or 3D.
- Limited palette of 4 to 6 colors chosen to match the season.
- Make it feel made by hand: slight irregularity in spacing and stroke, not a perfect grid.
Respond with JSON only: {"title": "3-6 words", "medium": "one phrase naming the visual language", "svg": "<svg ...>...</svg>", "statement": "2-3 sentences on what this mural records and why it takes this form"}`;

type SvgBrief = {
  title: string;
  medium: string;
  svg: string;
  statement: string;
};

function stripUnsafeSvg(raw: string): string {
  let svg = raw.trim();
  const fenced = svg.match(/```(?:svg|xml)?\s*([\s\S]*?)\s*```/i);
  if (fenced) svg = fenced[1]!.trim();

  const start = svg.search(/<svg\b/i);
  const end = svg.toLowerCase().lastIndexOf("</svg>");
  if (start >= 0 && end > start) {
    svg = svg.slice(start, end + "</svg>".length);
  }

  svg = svg.replace(
    /<(text|tspan|textPath|image|foreignObject|script)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,
    ""
  );
  svg = svg.replace(
    /<(text|tspan|textPath|image|foreignObject|script)\b[^>]*\/?\s*>/gi,
    ""
  );
  // Drop external references (http/https/data/protocol-relative).
  svg = svg.replace(
    /\s(?:xlink:)?href\s*=\s*(["'])\s*(?:https?:|\/\/|data:)[\s\S]*?\1/gi,
    ""
  );
  return svg.trim();
}

function parseBrief(text: string): SvgBrief | null {
  let parsed: {
    title?: unknown;
    medium?: unknown;
    svg?: unknown;
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
  const statement =
    typeof parsed.statement === "string"
      ? parsed.statement.trim().replace(/\s+/g, " ")
      : "";
  const svgRaw = typeof parsed.svg === "string" ? parsed.svg : "";
  if (!title || !medium || !statement || !svgRaw) return null;
  const svg = stripUnsafeSvg(svgRaw);
  if (!/<svg\b/i.test(svg) || !/<\/svg>/i.test(svg)) return null;
  return { title, medium, svg, statement };
}

async function requestBrief(season: DummySeason): Promise<SvgBrief | null> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 8000,
    messages: [
      {
        role: "user",
        content: `${SVG_BRIEF}\n\nSEASON DATA:\n${formatSeasonRecord(season)}`,
      },
    ],
  });
  const block = message.content.find((part) => part.type === "text");
  const text = block && block.type === "text" ? block.text : "";
  return parseBrief(text);
}

async function svgToPngDataUrl(svg: string): Promise<string> {
  const png = await sharp(Buffer.from(svg, "utf8"), { density: 150 })
    .resize(2400, 800, { fit: "fill" })
    .png()
    .toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}

export async function POST() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  try {
    const season = pickDummySeason();
    let brief = await requestBrief(season);
    let imageDataUrl: string | null = null;

    if (brief) {
      try {
        imageDataUrl = await svgToPngDataUrl(brief.svg);
      } catch {
        imageDataUrl = null;
      }
    }

    if (!brief || !imageDataUrl) {
      brief = await requestBrief(season);
      if (!brief) {
        return NextResponse.json(
          { ok: false, message: "The SVG mural brief could not be read. Try again." },
          { status: 200 }
        );
      }
      try {
        imageDataUrl = await svgToPngDataUrl(brief.svg);
      } catch {
        return NextResponse.json(
          { ok: false, message: "The SVG mural could not be rendered. Try again." },
          { status: 200 }
        );
      }
    }

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
      {
        ok: false,
        message: "This mural couldn't be drawn right now. Please try again.",
      },
      { status: 200 }
    );
  }
}
