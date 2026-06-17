export function uppercaseTitle(text: string) {
  return text.toUpperCase();
}

export function lowercaseName(text: string) {
  return text.toLowerCase();
}

export function formatTokenId(tokenId: string) {
  return `#${tokenId.toLowerCase()}`;
}

export function formatCreatedAt(iso: string) {
  const date = new Date(iso);
  return `Created ${date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })}`;
}

export function sentenceCase(text: string) {
  if (!text) return text;
  const trimmed = text.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export function normalizeType(type: string) {
  return type.toUpperCase();
}
