import { getValidArtworks } from "@/lib/redis";
import { Ticker } from "@/app/components/ticker";
import { LandingHero } from "@/app/components/landing-hero";

export default async function Home() {
  const artworks = await getValidArtworks();
  const tickerImages = artworks.map((a) => a.imageUrl);

  return (
    <div className="flex flex-1 flex-col min-h-screen bg-white">
      <div className="h-6 bg-white shrink-0" />
      <Ticker images={tickerImages} direction="left" />

      <LandingHero />

      <div className="h-6 bg-white shrink-0" />
      <Ticker images={tickerImages} direction="right" />
      <div className="h-6 bg-white shrink-0" />
    </div>
  );
}
