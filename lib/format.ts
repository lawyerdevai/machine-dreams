export function uppercaseTitle(text: string) {
  return text.toUpperCase();
}

export function lowercaseName(text: string) {
  return text.toLowerCase();
}

export function formatTokenId(tokenId: string) {
  return `#${tokenId.toLowerCase()}`;
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).toLowerCase();
}

export function sentenceCase(text: string) {
  if (!text) return text;
  const trimmed = text.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export function normalizeType(type: string) {
  return type.toUpperCase();
}
