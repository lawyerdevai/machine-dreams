import Image from "next/image";
import type { FrameKind } from "@/lib/murals/frame";

type Props = {
  frameKind: FrameKind;
  imageUrl: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  loading?: "lazy" | "eager";
  quality?: number;
  className?: string;
};

export function muralAlt(title: string, caption: string): string {
  const t = title.trim();
  const c = caption.trim();
  if (t && c) return `${t}. ${c}`;
  return t || c || "Mural";
}

export function MuralFrame({
  frameKind,
  imageUrl,
  alt,
  sizes,
  priority = false,
  loading,
  quality,
  className = "",
}: Props) {
  const craft = frameKind === "craft";
  const image = (
    <Image
      src={imageUrl}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      loading={priority ? undefined : (loading ?? "lazy")}
      quality={quality}
      className="object-cover"
    />
  );

  return (
    <div className={`mural-frame mural-frame--${frameKind} ${className}`.trim()}>
      {craft ? (
        <div className="mural-frame__mat">
          <div className="mural-frame__inner">{image}</div>
        </div>
      ) : (
        <div className="mural-frame__inner">{image}</div>
      )}
    </div>
  );
}
