"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { MuralPublicItem } from "@/lib/murals/types";
import { MuralFrame, muralAlt } from "./mural-frame";
import { WallLabel } from "./wall-label";

type Props = {
  item: MuralPublicItem;
  newerId: string | null;
  olderId: string | null;
};

export function ViewingRoomClient({ item, newerId, olderId }: Props) {
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === "ArrowLeft" && newerId) {
        e.preventDefault();
        router.push(`/murals/${newerId}`);
      } else if (e.key === "ArrowRight" && olderId) {
        e.preventDefault();
        router.push(`/murals/${olderId}`);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [newerId, olderId, router]);

  return (
    <div className="murals-room">
      <div className="murals-room__nav">
        <Link href="/murals">Back to gallery</Link>
        <button
          type="button"
          disabled={!newerId}
          onClick={() => newerId && router.push(`/murals/${newerId}`)}
        >
          ← Previous
        </button>
        <button
          type="button"
          disabled={!olderId}
          onClick={() => olderId && router.push(`/murals/${olderId}`)}
        >
          Next →
        </button>
      </div>

      <div className="murals-room__work">
        <div className="murals-hang">
          <div className="murals-hang__spot" aria-hidden="true" />
          <div className="murals-hang__body">
            <div className="murals-hang__shadow w-full">
              <MuralFrame
                frameKind={item.frameKind}
                imageUrl={item.imageUrl}
                alt={muralAlt(item.title, item.caption)}
                sizes="(max-width: 768px) 92vw, 52rem"
                priority
              />
            </div>
            <WallLabel
              title={item.title}
              caption={item.caption}
              seasonName={item.seasonName}
              titleAs="h1"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
