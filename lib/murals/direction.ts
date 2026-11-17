/**
 * Directed-mode helpers for murals briefs.
 * Empty / missing scene+cast must be a no-op so Auto briefs stay identical.
 */

export type MuralDirection = {
  scene?: string;
  cast?: string;
};

export type DirectedCastLine = {
  name: string;
  description: string;
};

const FACTION_TYPE_RE = /\b(Human|Cat|Alien|Agent|Zombie)\b/i;

/** Trim and drop empties; returns undefined when both scene and cast are blank. */
export function normalizeDirection(
  direction?: MuralDirection | null
): MuralDirection | undefined {
  if (!direction) return undefined;
  const scene =
    typeof direction.scene === "string" ? direction.scene.trim() : "";
  const cast = typeof direction.cast === "string" ? direction.cast.trim() : "";
  if (!scene && !cast) return undefined;
  return {
    ...(scene ? { scene } : {}),
    ...(cast ? { cast } : {}),
  };
}

export function hasDirectedContent(
  direction?: MuralDirection | null
): boolean {
  return Boolean(normalizeDirection(direction));
}

/** Parse "Name: description" lines; lines without a colon are name-only. */
export function parseDirectedCastLines(castText: string): DirectedCastLine[] {
  const lines: DirectedCastLine[] = [];
  for (const raw of castText.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const idx = line.indexOf(":");
    if (idx === -1) {
      lines.push({ name: line, description: "" });
      continue;
    }
    const name = line.slice(0, idx).trim();
    if (!name) continue;
    lines.push({ name, description: line.slice(idx + 1).trim() });
  }
  return lines;
}

/** If the admin description names a faction type, return the canonical form. */
export function typeFromDirectedDescription(
  description: string
): string | undefined {
  const match = FACTION_TYPE_RE.exec(description);
  if (!match) return undefined;
  const raw = match[1];
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

/**
 * BINDING DIRECTION block inserted after style (and cast) rules.
 * Returns "" when direction is absent or both fields empty — must not
 * change the brief string in that case (leading newline is included only
 * when content is present so the template stays byte-identical).
 */
export function bindingDirectionSection(
  direction?: MuralDirection | null
): string {
  const d = normalizeDirection(direction);
  if (!d) return "";

  const lines: string[] = [
    `- BINDING DIRECTION (requirements, not suggestions). The scene and cast below are binding requirements for the picture: do not substitute, add, or drop the named characters or the required event. Style, palette, medium, composition, and texture remain free to choose.`,
  ];
  if (d.scene) {
    lines.push(
      `- Required scene/event (this event must happen in the picture): ${d.scene}`
    );
  }
  if (d.cast) {
    const castLines = parseDirectedCastLines(d.cast);
    const castBody =
      castLines.length > 0
        ? castLines
            .map((line) =>
              line.description
                ? `  - ${line.name}: ${line.description}`
                : `  - ${line.name}`
            )
            .join("\n")
        : `  ${d.cast}`;
    lines.push(
      `- Required cast (use exactly these characters; choose only how they are arranged):\n${castBody}`
    );
  }
  return `\n${lines.join("\n")}`;
}
