import { SectionLabel } from "@/app/components/typography";
import { TYPE } from "@/lib/typography";

export const metadata = {
  title: "About Datagrams",
  description:
    "Data as Medium. A growing series — weekly artworks from Normies Pixel Market activity.",
};

export default function DatagramsAboutPage() {
  return (
    <main className="flex-1 px-6 py-12 flex flex-col gap-16">
      <section className="max-w-3xl mx-auto w-full flex flex-col gap-10">
        <div className="flex flex-col gap-4 text-center">
          <p className={`${TYPE.tagline} leading-relaxed`}>
            Data as Medium. A growing series built on a simple belief: data
            isn&apos;t just information, it&apos;s material. Every dataset
            carries a shape worth seeing.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <SectionLabel>How a week works</SectionLabel>
          <div className="h-px bg-[#0a0a0a] w-full" />
          <p className={TYPE.prose}>
            A new Datagram begins every Monday. Its theme comes from the week
            before: how busy the Normies Pixel Market was decides the world the
            piece is set in. The week&apos;s own activity then decides how much of
            that world appears. On Monday the picture is nearly empty, and it
            fills in day by day until, on Sunday, it is complete. You can step
            through any day of the week on the piece&apos;s page. The very first
            week had no week before it, so its theme is the absence of data: a
            world waiting for something to happen.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <SectionLabel>The schedule</SectionLabel>
          <div className="h-px bg-[#0a0a0a] w-full" />
          <p className={TYPE.prose}>
            Each week begins at midnight UTC on Monday, which is Sunday at 5 PM
            Pacific (4 PM once the clocks change in November). Within minutes,
            the new piece is generated from the week before&apos;s totals and goes
            live. While the week runs, the market is read about every 30 seconds,
            and the piece updates as the numbers change. Each new day, at that
            same time, reveals more of the picture. When Sunday ends, the week
            closes: its totals are final, the piece is complete, and the next
            week begins.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <SectionLabel>What the numbers do</SectionLabel>
          <div className="h-px bg-[#0a0a0a] w-full" />
          <p className={TYPE.prose}>
            Five numbers from the market shape every piece, and they are the same
            every week. Fills are trades completed. Volume is the ETH traded.
            Churn is listings opened or cancelled. Wallets are the distinct
            buyers and sellers. Volatility is how widely the price swung. Each
            piece uses them differently, and its page says exactly how. Alongside
            them, the day of the week sets what has arrived so far, the
            week&apos;s colours are chosen from its numbers, and the glitch, the
            interference that tears and smears the picture, takes its strength
            from them too.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <SectionLabel>Nothing is decoration</SectionLabel>
          <div className="h-px bg-[#0a0a0a] w-full" />
          <p className={TYPE.prose}>
            If something is in the picture, the page tells you which number put
            it there.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <SectionLabel>When the week ends</SectionLabel>
          <div className="h-px bg-[#0a0a0a] w-full" />
          <p className={TYPE.prose}>
            The finished picture is kept as a film and a still. Each piece is
            built from a fixed recipe, and that recipe&apos;s fingerprint is
            published when the work is minted, so what you see can always be
            checked against what was made.
          </p>
        </div>
      </section>
    </main>
  );
}
