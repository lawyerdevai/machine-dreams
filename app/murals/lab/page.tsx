import { notFound } from "next/navigation";
import { MuralsClient } from "./murals-client";

export const dynamic = "force-dynamic";

export default function MuralsLabPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }
  return <MuralsClient isDev />;
}
