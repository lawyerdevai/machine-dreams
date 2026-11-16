import Link from "next/link";
import type { MuralKind } from "@/lib/murals/types";

type Props = {
  title: string;
  caption: string;
  kind?: MuralKind;
  seasonNumber?: number;
  day?: number;
  /** When false, omit the kind/season/day meta line (Timeline stage puts it above the image). */
  includeSeason?: boolean;
  titleAs?: "h1" | "h2" | "h3" | "p";
  /** Timeline / viewing room: left flush. Grid: centered. */
  align?: "left" | "center";
  /** Optional small "View" link beside the title (Timeline stage). */
  viewHref?: string;
};

/** Public mono label: SEASON N, DAY N, or nothing. Never "Moment". */
export function publicKindLabel(
  kind: MuralKind | undefined,
  seasonNumber?: number,
  day?: number
): string | null {
  if (kind === "season") {
    if (typeof seasonNumber === "number" && Number.isFinite(seasonNumber)) {
      return `Season ${Math.trunc(seasonNumber)}`;
    }
    return "Season";
  }
  if (typeof day === "number" && Number.isFinite(day) && day > 0) {
    return `Day ${Math.trunc(day)}`;
  }
  return null;
}

export function WallLabel({
  title,
  caption,
  kind,
  seasonNumber,
  day,
  includeSeason = true,
  titleAs: Tag = "h2",
  align = "left",
  viewHref,
}: Props) {
  const meta = includeSeason
    ? publicKindLabel(kind, seasonNumber, day)
    : null;

  return (
    <div
      className={`murals-label ${align === "center" ? "murals-label--center" : ""}`}
    >
      <div className="murals-label__title-row">
        <Tag className="murals-label__title">{title}</Tag>
        {viewHref ? (
          <Link href={viewHref} className="murals-label__view">
            View
          </Link>
        ) : null}
      </div>
      {caption ? <p className="murals-label__caption">{caption}</p> : null}
      {meta ? <p className="murals-label__meta">{meta}</p> : null}
    </div>
  );
}
