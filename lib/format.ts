export function uppercaseTitle(text: string) {
  return (text ?? "").toUpperCase();
}

export function lowercaseName(text: string | null | undefined) {
  return (text ?? "").toLowerCase();
}

export function formatTokenId(tokenId: string | null | undefined) {
  return `#${(tokenId ?? "").toLowerCase()}`;
}

export function formatCreatedAt(iso: string) {
  const date = new Date(iso);
  const month = date.toLocaleDateString("en-US", { month: "long" });
  const day = date.getDate();
  const year = date.getFullYear();
  return `Created ${month} ${day}, ${year}`;
}

/** Compact relative time: "just now", "2h ago", "3d ago", "5w ago", "1y ago". */
export function formatRelativeTime(iso: string, now = Date.now()): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";

  const seconds = Math.max(0, Math.floor((now - then) / 1000));
  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 14) return `${days}d ago`;

  const weeks = Math.floor(days / 7);
  if (weeks < 8) return `${weeks}w ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;

  const years = Math.floor(days / 365);
  return `${years}y ago`;
}

export function sentenceCase(text: string) {
  if (!text) return text;
  const trimmed = text.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export function normalizeType(type: string) {
  return type.toUpperCase();
}
