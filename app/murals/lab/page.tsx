import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MuralsClient } from "./murals-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Murals Lab",
  robots: { index: false, follow: false },
};

export default function MuralsLabPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }
  return <MuralsClient isDev />;
}
