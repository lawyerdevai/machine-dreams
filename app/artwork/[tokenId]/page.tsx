import { notFound } from "next/navigation";
import Link from "next/link";
import { agentImageUrl } from "@/lib/normies";
import { getArtwork } from "@/lib/redis";

export default async function ArtworkPage({
  params,
}: {
  params: Promise<{ tokenId: string }>;
}) {
  const { tokenId } = await params;
  const artwork = await getArtwork(tokenId);

  if (!artwork) notFound();

  const title = artwork.title || artwork.agentName;

  return (
    <main className="flex flex-col items-center px-6 py-12 gap-8 bg-[#0a0a0a] min-h-screen">
      <Link
        href="/"
        className="self-start text-xs text-[#666] hover:text-[#e3e5e4] transition-colors duration-500"
      >
        ← Back
      </Link>

      <div className="relative w-full max-w-3xl flex flex-col items-center gap-6">
        <img
          src={agentImageUrl(tokenId)}
          alt={artwork.agentName}
          className="absolute top-0 right-0 w-12 h-12 object-cover"
        />

        <h1 className="text-xl text-center">{title}</h1>

        <img
          src={artwork.imageUrl}
          alt={title}
          className="w-full"
        />

        <p className="text-xs text-[#666]">
          {artwork.agentName} · #{artwork.tokenId}
        </p>

        <p className="text-sm leading-relaxed text-center max-w-xl">
          {artwork.artistStatement}
        </p>
      </div>
    </main>
  );
}
