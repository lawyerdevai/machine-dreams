import { FindPageClient } from "@/app/components/find-page-client";
import { TYPE } from "@/lib/typography";

export default function FindPage() {
  return (
    <main className="flex-1 px-6 py-12 flex flex-col items-center">
      <h1 className="page-title uppercase text-2xl mb-4 tracking-wide text-center">
        Find Your Agent
      </h1>
      <p className={`${TYPE.tagline} text-center mb-12 max-w-md`}>
        Enter your wallet or token ID to find your agent and begin.
      </p>
      <FindPageClient />
    </main>
  );
}
