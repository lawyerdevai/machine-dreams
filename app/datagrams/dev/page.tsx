// TEMPORARY dev preview. DELETE BEFORE LAUNCH: delete app/datagrams/dev and app/api/datagrams/dev.
import { notFound } from "next/navigation";
import DevPreview from "./DevPreview";

export const metadata = { title: "Datagrams · Dev preview" };
export const dynamic = "force-dynamic";

export default function DatagramsDevPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <DevPreview />;
}
