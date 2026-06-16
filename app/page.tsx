import { getAllArtworks } from "@/lib/redis";
import { HomeClient } from "./components/home-client";

export default async function Home() {
  const artworks = await getAllArtworks();

  return (
    <main className="flex flex-col items-center px-6 py-12 gap-8">
      <header className="w-full max-w-5xl">
        <h1 className="text-lg tracking-tight">Normies Atelier</h1>
      </header>
      <HomeClient artworks={artworks} />
    </main>
  );
}
