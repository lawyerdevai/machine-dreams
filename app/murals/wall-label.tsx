type Props = {
  title: string;
  caption: string;
  seasonName: string;
  titleAs?: "h1" | "h2" | "h3" | "p";
};

export function WallLabel({
  title,
  caption,
  seasonName,
  titleAs: Tag = "h2",
}: Props) {
  return (
    <div className="murals-label">
      <Tag className="murals-label__title">{title}</Tag>
      {caption ? <p className="murals-label__caption">{caption}</p> : null}
      <p className="murals-label__meta">{seasonName}</p>
    </div>
  );
}
