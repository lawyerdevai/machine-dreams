import { notFound } from "next/navigation";
import { ArenaGalleryClient } from "@/app/components/arena-gallery-client";
import { isArenaEnabled, listArenaPortraits } from "@/lib/arena";
import { isArenaIngredientId } from "@/lib/arena-schools";

export const dynamic = "force-dynamic";

function parseCount(value: string | undefined) {
  const parsed = Number.parseInt(value ?? "24", 10);
  if (!Number.isFinite(parsed)) return 24;
  return Math.min(960, Math.max(24, parsed));
}

export default async function ArenaGalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ count?: string; ingredient?: string }>;
}) {
  if (!isArenaEnabled()) notFound();
  const params = await searchParams;
  const count = parseCount(params.count);
  const ingredient = isArenaIngredientId(params.ingredient)
    ? params.ingredient
    : undefined;
  const { items, total } = await listArenaPortraits(count, ingredient);

  return (
    <ArenaGalleryClient
      portraits={items}
      total={total}
      count={count}
      ingredient={ingredient ?? "all"}
    />
  );
}
