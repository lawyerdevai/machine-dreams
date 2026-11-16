import Image from "next/image";
import type { FrameKind } from "@/lib/murals/frame";

type Props = {
  frameKind: FrameKind;
  imageUrl: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
};

export function muralAlt(title: string, caption: string): string {
  const t = title.trim();
  const c = caption.trim();
  if (t && c) return `${t}. ${c}`;
  return t || c || "Arena mural";
}

export function MuralFrame({
  frameKind,
  imageUrl,
  alt,
  sizes,
  priority = false,
  className = "",
}: Props) {
  const craft = frameKind === "craft";
  return (
    <div className={`mural-frame mural-frame--${frameKind} ${className}`.trim()}>
      {craft ? (
        <div className="mural-frame__mat">
          <div className="mural-frame__inner">
            <Image
              src={imageUrl}
              alt={alt}
              fill
              sizes={sizes}
              priority={priority}
              className="object-cover"
            />
          </div>
        </div>
      ) : (
        <div className="mural-frame__inner">
          <Image
            src={imageUrl}
            alt={alt}
            fill
            sizes={sizes}
            priority={priority}
            className="object-cover"
          />
        </div>
      )}
    </div>
  );
}
