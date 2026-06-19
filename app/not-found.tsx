import Link from "next/link";
import { TYPE } from "@/lib/typography";

export default function NotFound() {
  return (
    <main className="flex-1 px-6 py-12 flex flex-col items-center justify-center gap-8 text-center">
      <h1 className="page-title uppercase text-2xl tracking-wide">
        Normie Not Found
      </h1>
      <p className={`${TYPE.tagline} max-w-md leading-relaxed`}>
        This token doesn&apos;t match an awakened Normie. It may not exist, or
        it simply hasn&apos;t awakened yet.
      </p>
      <Link href="/find" className="btn-minimal">
        Find Your Agent
      </Link>
    </main>
  );
}
