"use client";

import { ThirdwebProvider } from "thirdweb/react";

/** Client wrapper so the root layout (server) can mount thirdweb state. */
export function ThirdwebProviderClient({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ThirdwebProvider>{children}</ThirdwebProvider>;
}
