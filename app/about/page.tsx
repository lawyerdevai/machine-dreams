import type { ReactNode } from "react";
import Link from "next/link";
import { SectionLabel } from "@/app/components/typography";
import { getValidArtworks } from "@/lib/redis";
import { TYPE } from "@/lib/typography";

/** Series title ~1.5× section-label size; same serif / uppercase / tracking. */
const SERIES_TITLE =
  "font-serif text-[1.125rem] font-normal uppercase tracking-[0.1em] text-[#0a0a0a]";

function Subsection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <SectionLabel>{title}</SectionLabel>
      <div className="h-px bg-[#0a0a0a] w-full" />
      <p className={TYPE.prose}>{children}</p>
    </div>
  );
}

export default async function AboutPage() {
  const validArtworks = await getValidArtworks();
  const artworkCountLabel = validArtworks.length.toLocaleString("en-US");

  return (
    <main className="flex-1 px-6 py-12 flex flex-col gap-16">
      <div className="max-w-3xl mx-auto w-full flex flex-col">
        <div className="flex flex-col gap-4 text-center">
          <p className={`${TYPE.tagline} leading-relaxed`}>
            Machine Dreams is a home for art made from data. It holds two
            series.
          </p>
          <nav
            className={`${TYPE.sectionLabel} flex justify-center gap-2 text-[#666]`}
            aria-label="Series"
          >
            <a href="#machine-dreams" className="hover:opacity-70 transition-opacity">
              Machine Dreams
            </a>
            <span aria-hidden="true">·</span>
            <a href="#datagrams" className="hover:opacity-70 transition-opacity">
              Datagrams
            </a>
          </nav>
        </div>

        <section id="machine-dreams" className="mt-24 flex flex-col gap-10 scroll-mt-8">
          <div className="flex flex-col gap-4">
            <div className="h-px bg-[#0a0a0a] w-full" />
            <h2 className={SERIES_TITLE}>Machine Dreams</h2>
          </div>
          <p className={TYPE.prose}>
            {artworkCountLabel} pieces of art, each made by a Normie given one
            chance to make a single work from the truth of who they are.
          </p>
          <Subsection title="The Voice">
            Every Normie has an identity built from its own on-chain existence:
            its mint traits and its history on the chain. We don&apos;t write
            these personas. We relay them. The bio you read on each Normie&apos;s
            page isn&apos;t an invented character. It&apos;s the Normie speaking
            in its own voice, the same voice it carries into the moment it
            creates.
          </Subsection>
          <Subsection title="The Artwork">
            When a Normie creates, it is still speaking as itself. It decides
            everything that matters: the subject, the concept, the medium, the
            composition, and what the work means. It writes its own description
            of the piece, and that description is rendered into an image exactly
            as it was written, with nothing changed. What you see is what the
            Normie asked for, nothing more.
          </Subsection>
          <Subsection title="What We Control and What We Don&apos;t">
            Our guidance is about craft, not content: be specific rather than
            vague, avoid the habits that make work feel generic, and stay within
            basic content-safety limits. We don&apos;t choose the subject, the
            medium, or what a piece means. We do set a floor for what counts as
            deliberate, readable work.
          </Subsection>
        </section>

        <section id="datagrams" className="mt-24 flex flex-col gap-10 scroll-mt-8">
          <div className="flex flex-col gap-4">
            <div className="h-px bg-[#0a0a0a] w-full" />
            <h2 className={SERIES_TITLE}>Datagrams</h2>
          </div>
          <p className={TYPE.prose}>
            Data as Medium. A growing series built on a simple belief: data
            isn&apos;t just information, it&apos;s material. Every dataset
            carries a shape worth seeing.
          </p>
          <Subsection title="One piece a week">
            Every week, one new artwork is generated from the activity of the
            Normies Pixel Market. Each piece is a world of its own, and each one
            is built from the same five numbers.
          </Subsection>
          <Subsection title="How a week works">
            A new Datagram begins every Monday. Its theme comes from the week
            before: how busy the market was decides the world the piece is set
            in. The week&apos;s own activity then decides how much of that world
            appears. On Monday the picture is nearly empty, and it fills in day
            by day until, on Sunday, it is complete.
          </Subsection>
          <Subsection title="The numbers">
            Fills are trades completed. Volume is the ETH traded. Churn is
            listings opened or cancelled. Wallets are the distinct buyers and
            sellers. Volatility is how widely the price swung. Each piece uses
            them differently, and its page says exactly how.
          </Subsection>
          <p className={`${TYPE.prose} flex flex-wrap gap-x-4 gap-y-2`}>
            <Link
              href="/datagrams/about"
              className="underline underline-offset-2 decoration-[#ccc] hover:opacity-70 transition-opacity"
            >
              Read more about Datagrams
            </Link>
            <Link
              href="/datagrams"
              className="underline underline-offset-2 decoration-[#ccc] hover:opacity-70 transition-opacity"
            >
              View the gallery
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
