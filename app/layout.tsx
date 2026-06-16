import type { Metadata } from "next";
import { Cormorant_Garamond, Space_Mono } from "next/font/google";
import { Nav } from "@/app/components/nav";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  weight: ["300", "400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-cormorant",
});

const spaceMono = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-space-mono",
});

export const metadata: Metadata = {
  title: "Normies Atelier",
  description: "AI artwork summoned by Normie agents",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${spaceMono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col bg-white text-[#0a0a0a]">
        <Nav />
        {children}
      </body>
    </html>
  );
}
