import Image from "next/image";
import Link from "next/link";
import { getValidArtworks } from "@/lib/redis";
import { agentImageUrl } from "@/lib/normies";
import { LandingNav } from "@/app/components/landing-hero";
import { NormiePfpBadge } from "@/app/components/normie-pfp-badge";
import { DataCharGrid } from "@/app/components/data-char-grid";
import DataForest from "@/components/data-forest/DataForest";
import { TYPE } from "@/lib/typography";
import type { Artwork } from "@/lib/types";

const PREVIEW_COUNT = 12;

export const dynamic = "force-dynamic";

function sampleArtworks(artworks: Artwork[], size: number): Artwork[] {
  const copy = [...artworks];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(size, copy.length));
}

export default async function Home() {
  const artworks = await getValidArtworks();
  const previewArtworks = sampleArtworks(artworks, PREVIEW_COUNT);

  return (
    <div className="flex flex-1 flex-col min-h-screen bg-white">
      <LandingNav />
      <div
        className="w-full overflow-hidden"
        style={{ height: "max(360px, min(667px, 60vw))" }}
      >
        <DataForest />
      </div>

      {/* 01 — Data as Medium */}
      <section className="w-full px-6 pt-8 md:pt-10 pb-14 md:pb-20">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-12 items-center">
          <div className="w-full min-w-0 order-2 md:order-1">
            <DataCharGrid />
          </div>
          <div className="flex flex-col gap-5 md:gap-6 order-1 md:order-2">
            <div className="flex flex-col gap-2">
              <span className="font-mono text-[72px] md:text-[120px] leading-none font-normal text-[#e8e8e8] select-none">
                01
              </span>
              <h2 className="page-title uppercase text-2xl md:text-3xl tracking-wide">
                Data as Medium
              </h2>
            </div>
            <p className={`${TYPE.proseSm} text-[#666] max-w-md`}>
              A growing series built on a simple belief: data isn&apos;t just
              information, it&apos;s material. Every dataset carries a shape
              worth seeing.
            </p>
            <div>
              <Link href="/datagrams" className="btn-minimal">
                Datagrams
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 02 — Normies Artworks */}
      <section className="w-full border-t border-[#0a0a0a] px-6 py-10 md:py-14">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-12 items-start">
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-2">
              <span className="font-mono text-[72px] md:text-[120px] leading-none font-normal text-[#e8e8e8] select-none">
                02
              </span>
              <h2 className="page-title uppercase text-2xl md:text-3xl tracking-wide">
                Normies Artworks
              </h2>
            </div>
            <p className={`${TYPE.proseSm} text-[#666] max-w-md`}>
              Each awakened Normie is given one canvas and one chance to make a
              single work from the truth of who they are. What they write is
              rendered exactly as asked, nothing touched afterward.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/find" className="btn-minimal">
                Create
              </Link>
              <Link href="/gallery?category=normie" className="btn-minimal">
                Gallery
              </Link>
            </div>
          </div>

          {previewArtworks.length > 0 ? (
            <div className="grid grid-cols-3 md:grid-cols-4 gap-1.5 max-md:gap-1 w-full max-md:max-w-[17.5rem] max-md:justify-self-start md:max-w-[28rem] md:justify-self-end max-md:[&>*:nth-child(n+7)]:hidden">
              {previewArtworks.map((artwork) => (
                <Link
                  key={artwork.tokenId}
                  href={`/artwork/${artwork.tokenId}`}
                  className="relative aspect-square overflow-hidden bg-[#0a0a0a] transition-opacity hover:opacity-85"
                >
                  <Image
                    src={artwork.imageUrl}
                    alt={artwork.title}
                    fill
                    sizes="(max-width: 768px) 28vw, 112px"
                    className="object-cover"
                  />
                  <NormiePfpBadge src={agentImageUrl(artwork.tokenId)} />
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
