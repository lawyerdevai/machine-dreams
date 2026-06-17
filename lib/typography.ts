/**
 * Two-system typography for Machine Dreams.
 * Serif: voice, headings, labels, buttons (via btn-*), prose.
 * Mono: names, tokens, dates, inputs, status/metadata chrome.
 */
export const TYPE = {
  sectionLabel: "type-section-label",
  artworkTitle: "type-artwork-title",
  tileTitle: "type-tile-title",
  tagline: "type-tagline",
  prose: "text-prose",
  proseSm: "type-prose-sm",
  metadata: "type-metadata",
  metadataLg: "type-metadata-lg",
  input:
    "type-input border border-[#0a0a0a] px-3 py-2 bg-white w-full focus:outline-none",
  status: "type-status",
  statusError: "type-status type-status-error",
} as const;
