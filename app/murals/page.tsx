import { fetchPublicMurals } from "./public-data";
import { MuralsGalleryClient } from "./gallery-client";
import "./murals-gallery.css";

export const revalidate = 300;

export const metadata = {
  title: "Arena Murals",
  description: "One work for every season of the Normies Arena.",
};

export default async function MuralsGalleryPage() {
  let items: Awaited<ReturnType<typeof fetchPublicMurals>> = [];
  try {
    items = await fetchPublicMurals();
  } catch {
    items = [];
  }

  return (
    <main className="murals-page">
      <header className="px-5 pt-8 pb-2 text-center md:pt-10">
        <h1 className="murals-heading text-3xl md:text-4xl">Arena Murals</h1>
        <p className="murals-lede mx-auto mt-3 max-w-md text-base md:text-lg">
          One work for every season of the Normies Arena.
        </p>
      </header>
      <MuralsGalleryClient items={items} />
    </main>
  );
}
