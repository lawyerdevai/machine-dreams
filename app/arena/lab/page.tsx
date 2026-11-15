/**
 * TEMPORARY. Delete app/arena/lab and app/api/arena/lab before launch.
 */
import { notFound } from "next/navigation";
import { ArenaLabClient } from "./lab-client";

export const dynamic = "force-dynamic";

export default function ArenaLabPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <ArenaLabClient />;
}
