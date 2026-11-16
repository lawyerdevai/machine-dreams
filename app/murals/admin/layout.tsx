import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Murals Admin",
  robots: { index: false, follow: false },
};

export default function MuralsAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
