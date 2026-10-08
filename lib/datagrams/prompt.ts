import { SPEC, EXEMPLARS } from "./spec";
import type { WeekRecord, WeekStats } from "./types";

export function systemPrompt(): string { return SPEC; }

const line = (s: WeekStats) => `fills ${s.fills}, volumeEth ${s.volumeEth}, churn ${s.churn}, wallets ${s.wallets}, volatility ${s.volatility}`;

/** `basis` = last week's final totals (the theme). null means week one: there is no previous week. */
export function userPrompt(weekKey: string, basis: WeekStats | null, history: WeekRecord[]): string {
  const prev = history.filter((h) => h.weekKey < weekKey).slice(0, 12);
  const hist = prev.length
    ? prev.map((h) => `${h.weekKey} "${h.title}"${h.basis ? ": theme was made from " + line(h.basis) : " (the dataless launch week)"}`).join("\n")
    : "none: this is the first scene ever written.";
  const head = basis
    ? [
        `THIS SCENE PLAYS IN THE WEEK STARTING ${weekKey} (Monday, UTC). It starts empty and fills in as that week's real numbers arrive.`,
        ``,
        `LAST WEEK'S TOTALS (this is the theme; choose the world from them):`,
        `fills: ${basis.fills}`,
        `volumeEth: ${basis.volumeEth}`,
        `churn (listings opened + cancelled): ${basis.churn}`,
        `wallets: ${basis.wallets}`,
        `volatility (0-1): ${basis.volatility}`,
      ]
    : [
        `THIS SCENE PLAYS IN THE WEEK STARTING ${weekKey} (Monday, UTC). It is the launch week of the Pixel Market.`,
        ``,
        `THERE IS NO PREVIOUS WEEK. The market opened this week and no data exists before it. The theme is that absence (see WEEK ONE EXCEPTION). The scene starts empty and is brought into being by this week's real numbers as they arrive.`,
      ];
  return [
    ...head,
    ``,
    `EARLIER SCENES, newest first (do not resemble them in subject, composition or glitch character):`,
    hist,
    ``,
    `EXAMPLES OF THE FORMAT AND LEVEL OF CRAFT. Different subjects; do not copy or echo them. (They were written for a different, non-unfolding setup, so ignore how they use the numbers and follow THE WEEK UNFOLDS in your instructions.)`,
    ...EXEMPLARS.map((e) => `--- ${e.name} ---\n${e.text}`),
    ``,
    `Now write this week's scene file.`,
  ].join("\n");
}
