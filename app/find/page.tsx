import { FindPageClient } from "@/app/components/find-page-client";

export default function FindPage() {
  return (
    <main className="flex-1 px-6 py-12 flex flex-col items-center">
      <h1 className="page-title uppercase text-2xl mb-12 tracking-wide text-center">
        Find Your Agent
      </h1>
      <FindPageClient />
    </main>
  );
}
