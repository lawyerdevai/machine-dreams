import { MuralsClient } from "./murals-client";

export const dynamic = "force-dynamic";

export default function MuralsPage() {
  const isDev = process.env.NODE_ENV === "development";
  return <MuralsClient isDev={isDev} />;
}
