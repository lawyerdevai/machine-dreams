import { fetchPublicMurals } from "./public-data";
import { MuralsGalleryClient } from "./gallery-client";
import "./murals-gallery.css";

export const revalidate = 300;

export const metadata = {
  title: "Murals",
  description: "Made from each season of the Normies Arena.",
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
      <MuralsGalleryClient items={items} />
    </main>
  );
}
