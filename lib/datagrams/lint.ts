/** Cheap checks on a scene file before it is saved. The real safety is the sandboxed iframe; this catches mistakes. */
export type LintResult = { ok: true; scene: string; title: string } | { ok: false; reason: string };

const FORBIDDEN =
  /\b(fetch|XMLHttpRequest|WebSocket|importScripts|eval|Function|localStorage|sessionStorage|indexedDB|document|window|globalThis|constructor|__proto__|prototype|setTimeout|setInterval|requestAnimationFrame|while|import)\b/;

export function lintScene(raw: string): LintResult {
  let text = raw.replace(/^```[a-z]*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
  const start = text.indexOf("SCENE ");
  if (start < 0) return { ok: false, reason: "no SCENE line" };
  text = text.slice(start);
  if (text.length > 60000) return { ok: false, reason: "file is too long" };

  const first = text.split("\n")[0].replace(/^SCENE\s+/, "");
  let head: any;
  try { head = JSON.parse(first); } catch { return { ok: false, reason: "the SCENE line is not valid one-line JSON" }; }
  if (typeof head.title !== "string" || !head.title.trim()) return { ok: false, reason: "SCENE has no title" };
  if (/\d/.test(head.title)) return { ok: false, reason: "the title must not contain digits" };
  if (!head.glitch || typeof head.glitch !== "object") return { ok: false, reason: "SCENE has no glitch object" };
  const rat = Array.isArray(head.rationale) ? head.rationale : [];
  if (rat.length < 4) return { ok: false, reason: "rationale needs at least 4 rows" };
  for (const r of rat) {
    if (!r || typeof r.factor !== "string" || typeof r.effect !== "string") return { ok: false, reason: "a rationale row is malformed" };
    const isTheme = /theme/i.test(r.factor);
    if (!isTheme && !/[{\d]/.test(String(r.value ?? ""))) return { ok: false, reason: `rationale row "${r.factor}" must quote a real number with a {token}` };
    if (/\b(very|extremely)\s+(low|high|quiet|busy)\b/i.test(r.effect)) return { ok: false, reason: `rationale row "${r.factor}" uses an adjective instead of the number` };
  }

  if (!rat.some((r: any) => /theme/i.test(r.factor))) return { ok: false, reason: 'the rationale needs a row with factor "theme"' };
  const dayUses = (text.match(/"(?:=|if":\s*"=)[^"\n]*\b(day|progress)\b/g) || []).length;
  if (dayUses < 2) return { ok: false, reason: "use day or progress in at least two expressions so the week visibly unfolds" };

  const layers = text.split("\n").filter((l) => /^LAYER\s/.test(l)).length;
  if (layers < 5 || layers > 16) return { ok: false, reason: `needs 6 to 14 layers, has ${layers}` };

  const blocks = [...text.matchAll(/<<<(?:draw|init)\n([\s\S]*?)\n>>>/g)].map((m) => m[1]);
  if (!blocks.length) return { ok: false, reason: "no paint or live layer with code (at least one is required)" };
  for (const b of blocks) {
    const bad = b.match(FORBIDDEN);
    if (bad) return { ok: false, reason: `code uses "${bad[0]}", which is not allowed` };
    if (/for\s*\(\s*;/.test(b) || /for\s*\([^;]*;\s*;/.test(b)) return { ok: false, reason: "a for loop has no end condition" };
  }
  if ((text.match(/<<</g) || []).length !== (text.match(/^>>>\s*$/gm) || []).length) return { ok: false, reason: "a code block is not closed with >>>" };
  return { ok: true, scene: text + "\n", title: head.title.trim() };
}
