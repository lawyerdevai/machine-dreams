interface TickerProps {
  images: (string | null)[];
  direction: "left" | "right";
}

const SIZE = 160;

export function Ticker({ images, direction }: TickerProps) {
  const valid = images.filter(Boolean) as string[];
  if (valid.length === 0) return null;

  const items = [...valid, ...valid];

  return (
    <div
      className="w-full overflow-hidden bg-[#0a0a0a]"
      style={{ height: SIZE }}
    >
      <div
        className={`flex w-max ${direction === "left" ? "ticker-left" : "ticker-right"}`}
        style={{ height: SIZE }}
      >
        {items.map((src, i) => (
          <div
            key={`${src ?? "black"}-${i}`}
            className="shrink-0"
            style={{ width: SIZE, height: SIZE }}
          >
            {src ? (
              <img
                src={src}
                alt=""
                className="object-cover"
                style={{ width: SIZE, height: SIZE }}
              />
            ) : (
              <div
                className="bg-[#0a0a0a]"
                style={{ width: SIZE, height: SIZE }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
