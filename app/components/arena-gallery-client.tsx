"use client";

import Image from "next/image";
import Link from "next/link";
import { NormiePfpBadge } from "@/app/components/normie-pfp-badge";
import { lowercaseName, uppercaseTitle } from "@/lib/format";
import { agentImageUrl } from "@/lib/normies";
import { arenaPiecePath } from "@/lib/routes";
import {
  ARENA_INGREDIENTS,
  arenaRecipeLabel,
  type ArenaIngredientId,
} from "@/lib/arena-schools";
import type { ArenaPortrait } from "@/lib/arena";

const PAGE = 24;

export function ArenaGalleryClient({
  portraits,
  total,
  count,
  ingredient,
}: {
  portraits: ArenaPortrait[];
  total: number;
  count: number;
  ingredient: "all" | ArenaIngredientId;
}) {
  const nextCount = Math.min(total, count + PAGE);
  const moreHref =
    ingredient === "all"
      ? `/arena?count=${nextCount}`
      : `/arena?ingredient=${ingredient}&count=${nextCount}`;

  const chips = (
    <div className="mb-8 flex flex-wrap gap-2">
      <Link
        href="/arena"
        className={`btn-nav text-xs ${ingredient === "all" ? "bg-[#15120f] text-[#f2ead8]" : ""}`}
      >
        All
      </Link>
      {ARENA_INGREDIENTS.map((item) => (
        <Link
          key={item.id}
          href={`/arena?ingredient=${item.id}`}
          className={`btn-nav text-xs ${
            ingredient === item.id ? "bg-[#15120f] text-[#f2ead8]" : ""
          }`}
        >
          {item.name}
        </Link>
      ))}
    </div>
  );

  if (total === 0) {
    return (
      <main className="flex flex-1 flex-col items-center px-6 pb-16 pt-6 text-center">
        <h1 className="page-title mb-6 text-2xl uppercase tracking-wide">
          Arena Portraits
        </h1>
        {chips}
        <p className="mb-8 font-serif text-[#15120f]">
          {ingredient === "all" ? "No portraits yet." : "None in this finish."}
        </p>
        {ingredient === "all" ? (
          <Link href="/arena/create" className="btn-minimal">
            Create
          </Link>
        ) : null}
      </main>
    );
  }

  return (
    <main className="flex-1 px-6 pb-16 pt-4">
      <h1 className="page-title mb-8 text-2xl uppercase tracking-wide">
        Arena Portraits
      </h1>
      {chips}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {portraits.map((portrait) => (
          <Link
            key={portrait.tokenId}
            href={arenaPiecePath(portrait.tokenId)}
            className="group relative aspect-square overflow-hidden bg-[#15120f]"
          >
            <Image
              src={portrait.imageUrl}
              alt={portrait.title}
              fill
              sizes="(max-width: 768px) 45vw, 16vw"
              className="object-cover"
            />
            <NormiePfpBadge src={agentImageUrl(portrait.tokenId)} />
            <div className="pointer-events-none absolute inset-0 flex flex-col justify-end bg-black/70 p-2 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
              <span className="truncate font-serif text-xs uppercase leading-tight tracking-wide text-white">
                {uppercaseTitle(portrait.title)}
              </span>
              <span className="truncate font-serif text-[10px] leading-tight text-white/80">
                {arenaRecipeLabel(portrait.primary, portrait.accents)}
              </span>
              <span className="truncate font-serif text-[10px] leading-tight text-white/80">
                {lowercaseName(portrait.name)}
              </span>
            </div>
          </Link>
        ))}
      </div>
      {portraits.length < total ? (
        <div className="mt-10 flex justify-center">
          <Link href={moreHref} className="btn-minimal">
            Load more
          </Link>
        </div>
      ) : null}
    </main>
  );
}
