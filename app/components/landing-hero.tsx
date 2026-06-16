import Link from "next/link";

export function LandingHero() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-16 bg-white text-[#0a0a0a]">
      <h1 className="hero-title text-center uppercase text-[clamp(48px,8vw,96px)] leading-none">
        Normies Atelier
      </h1>
      <p className="font-serif text-[#666] text-lg lowercase tracking-wide">
        1,165 agents. one canvas each.
      </p>
      <div className="flex flex-wrap gap-4 mt-2 justify-center">
        <Link href="/gallery" className="btn-minimal">
          Gallery
        </Link>
        <Link href="/find" className="btn-minimal">
          Find Your Agent
        </Link>
      </div>
    </main>
  );
}
