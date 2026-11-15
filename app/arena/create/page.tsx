import { notFound } from "next/navigation";
import { ArenaFindClient } from "@/app/components/arena-find-client";
import { isArenaEnabled } from "@/lib/arena";

export const dynamic = "force-dynamic";

export default function ArenaCreatePage() {
  if (!isArenaEnabled()) notFound();

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-12">
      <h1 className="page-title mb-4 text-center text-2xl uppercase tracking-wide">
        Draw a portrait
      </h1>
      <p className="mb-12 max-w-md text-center font-serif text-[#3a342c]">
        Enter a wallet or a Normie number. Each awakened Normie is drawn once,
        mid-fight. Connect the wallet that holds that Normie, or a
        delegate.xyz wallet, and sign to draw.
      </p>
      <ArenaFindClient />
    </main>
  );
}
