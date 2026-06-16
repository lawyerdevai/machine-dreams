interface TickerProps {
  images: (string | null)[];
  direction: "left" | "right";
}

const MIN_SQUARES = 16;
const SIZE = 160;

function buildTickerItems(images: (string | null)[]): (string | null)[] {
  const valid = images.filter(Boolean) as string[];
  const base = valid.length > 0 ? valid : Array(MIN_SQUARES).fill(null);
  return [...base, ...base];
}

export function Ticker({ images, direction }: TickerProps) {
  const items = buildTickerItems(images);

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
