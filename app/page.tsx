import Link from "next/link";
import { getValidArtworks } from "@/lib/redis";
import { Ticker } from "@/app/components/ticker";
import { LandingHero } from "@/app/components/landing-hero";

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default async function Home() {
  const artworks = await getValidArtworks();
  const tickerImages = artworks
    .map((a) => a.imageUrl)
    .filter((url): url is string => !!url);
  const topTickerImages = shuffle(tickerImages);
  const bottomTickerImages = shuffle(tickerImages);

  return (
    <div className="flex flex-1 flex-col min-h-screen bg-white">
      <div className="h-6 bg-white shrink-0" />
      <Ticker images={topTickerImages} direction="left" />

      <LandingHero awakenedCount={artworks.length} />

      <div className="h-6 bg-white shrink-0" />
      <Ticker images={bottomTickerImages} direction="right" />
      <div className="h-6 bg-white shrink-0" />

      <footer className="px-6 pb-10 text-center">
        <Link
          href="/about"
          className="font-mono text-xs uppercase tracking-widest text-[#666] hover:text-[#0a0a0a] transition-colors"
        >
          About / How It Works
        </Link>
      </footer>
    </div>
  );
}
