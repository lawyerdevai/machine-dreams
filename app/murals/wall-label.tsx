import Link from "next/link";

type Props = {
  title: string;
  caption: string;
  seasonNumber?: number;
  /** When false, omit the season line (Timeline stage puts it above the frame). */
  includeSeason?: boolean;
  titleAs?: "h1" | "h2" | "h3" | "p";
  /** Timeline / viewing room: left flush. Grid: centered. */
  align?: "left" | "center";
  /** Optional small "View" link beside the title (Timeline stage). */
  viewHref?: string;
};

export function WallLabel({
  title,
  caption,
  seasonNumber,
  includeSeason = true,
  titleAs: Tag = "h2",
  align = "left",
  viewHref,
}: Props) {
  const showSeason =
    includeSeason &&
    typeof seasonNumber === "number" &&
    Number.isFinite(seasonNumber);

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
      {showSeason ? (
        <p className="murals-label__meta">Season {Math.trunc(seasonNumber)}</p>
      ) : null}
    </div>
  );
}
