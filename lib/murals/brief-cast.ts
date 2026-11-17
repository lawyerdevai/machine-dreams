/**
 * Pure cast helpers for mural briefs (no server-only; safe for brief-proof scripts).
 */
import type { NormieCastMember } from "./types";

const FACIAL_HAIR_RE =
  /\b(beard|shaven|goatee|mustache|moustache|chin\s*strap|handlebars|muttonchops|stubble|whisker)\b/i;
const HEADWEAR_RE =
  /\b(hat|cap|bandana|fedora|beanie|beret|hood|hoodie|do-?rag|helmet|crown|turban|headband)\b/i;

/** Traits allowed into the Claude brief / imagePrompt path. */
export function traitsForBrief(
  traits: Record<string, string> | undefined
): Record<string, string> | undefined {
  if (!traits) return undefined;
  const out: Record<string, string> = {};
  if (traits["Eyes"]?.trim()) out["Eyes"] = traits["Eyes"].trim();
  if (traits["Hair Style"]?.trim()) out["Hair Style"] = traits["Hair Style"].trim();
  const facial = traits["Facial Feature"]?.trim();
  if (facial && FACIAL_HAIR_RE.test(facial)) {
    out["Facial Feature"] = facial;
  }
  const accessory = traits["Accessory"]?.trim();
  if (accessory && HEADWEAR_RE.test(accessory)) {
    out.Accessory = accessory;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export function hasMatchedNormieCast(
  cast: NormieCastMember[] | undefined
): boolean {
  return Boolean(cast?.some((member) => member.status === "matched"));
}

/**
 * Format matched cast for the brief CAST section (allowlisted traits only).
 * When directedDescription is set, use that instead of API traits for the brief.
 */
export function formatNormieCastForBrief(cast: NormieCastMember[]): string {
  const matched = cast.filter((member) => member.status === "matched");
  if (matched.length === 0) return "(none matched)";
  return matched
    .map((member) => {
      if (member.directedDescription?.trim()) {
        return `- ${member.name}: type=${member.type ?? "unknown"}; description: ${member.directedDescription.trim()}`;
      }
      const briefTraits = traitsForBrief(member.traits);
      const traitParts = briefTraits
        ? Object.entries(briefTraits)
            .map(([key, value]) => `${key}=${value}`)
            .join("; ")
        : "(no brief traits)";
      return `- ${member.name}: type=${member.type ?? "unknown"}; traits: ${traitParts}`;
    })
    .join("\n");
}

/**
 * Extra brief rules for the text path when a Normie cast was looked up.
 * Only matched members are listed in CAST; unmatched names keep kit-only behavior.
 */
export function textPathCastBriefRules(cast: NormieCastMember[]): string {
  return `- CAST (matched Normies looked up from the source):
${formatNormieCastForBrief(cast)}
- Named cast Normies are specific individuals in the picture. Map each Normie's type (Human, Cat, Alien, Agent, Zombie) to the matching faction kit for form, scale, and origin scaffolding only; then apply the brief traits (eyewear, hair, facial hair, headwear) in plain visual words wherever the style allows. Do not invent color from the pixel art. The banned faction words still must not appear in imagePrompt.
- Prefer featuring cast Normies who are central to the chosen moment. Unnamed supporting figures (if any) use faction kits only and are not individuals.
- Choose the number of figures that best serves the moment. Named cast Normies should be the central figures; do not pad the cast to match a random size.
- Names in the cast may be used in the title and caption. Do not mention token numbers or the API anywhere in the title or caption.
- Normies named in the text that are not in the cast keep the current behavior (kits choose their form).
`;
}
