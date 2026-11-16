import Image from "next/image";
import type { FrameKind } from "@/lib/murals/frame";

type Props = {
  /** Stored on records; unused for public display styling. */
  frameKind?: FrameKind;
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

/** Public mural image: 3:2, no border/mat/bezel, soft shadow via CSS. */
export function MuralFrame({
  imageUrl,
  alt,
  sizes,
  priority = false,
  loading,
  quality,
  className = "",
}: Props) {
  return (
    <div className={`mural-frame ${className}`.trim()}>
      <div className="mural-frame__inner">
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
      </div>
    </div>
  );
}
