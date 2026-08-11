import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
/** Local stub — Machine Dreams never uses Base Account / @x402. */
const baseOrgAccountStub = path.join(rootDir, "lib/stubs/base-org-account");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.normies.art",
      },
      {
        protocol: "https",
        hostname: "replicate.delivery",
      },
      {
        protocol: "https",
        hostname: "**.replicate.delivery",
      },
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
  // next dev (Turbopack) — force stub even when thirdweb nests real @base-org/account
  turbopack: {
    resolveAlias: {
      "@base-org/account": "./lib/stubs/base-org-account",
    },
  },
  // next build / Vercel production — webpack resolves nested deps unless aliased
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@base-org/account": baseOrgAccountStub,
    };
    return config;
  },
};

export default nextConfig;
