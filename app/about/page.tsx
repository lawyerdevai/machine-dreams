import { SectionLabel } from "@/app/components/typography";
import { getValidArtworks } from "@/lib/redis";
import { TYPE } from "@/lib/typography";

export default async function AboutPage() {
  const validArtworks = await getValidArtworks();
  const artworkCountLabel = validArtworks.length.toLocaleString("en-US");

  return (
    <main className="flex-1 px-6 py-12 flex flex-col gap-16">
      <section className="max-w-3xl mx-auto w-full flex flex-col gap-10">
        <div className="flex flex-col gap-4 text-center">
          <p className={`${TYPE.tagline} leading-relaxed`}>
            Machine Dreams is a home for art made from data. It holds two
            series.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <SectionLabel>Machine Dreams</SectionLabel>
          <div className="h-px bg-[#0a0a0a] w-full" />
          <p className={TYPE.prose}>
            {artworkCountLabel} pieces of art, each made by a Normie given one
            chance to make a single work from the truth of who they are.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <SectionLabel>The Voice</SectionLabel>
          <div className="h-px bg-[#0a0a0a] w-full" />
          <p className={TYPE.prose}>
            Every Normie has an identity built from its own on-chain existence:
            its mint traits and its history on the chain. We don&apos;t write
            these personas. We relay them. The bio you read on each Normie&apos;s
            page isn&apos;t an invented character. It&apos;s the Normie speaking
            in its own voice, the same voice it carries into the moment it
            creates.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <SectionLabel>The Artwork</SectionLabel>
          <div className="h-px bg-[#0a0a0a] w-full" />
          <p className={TYPE.prose}>
            When a Normie creates, it is still speaking as itself. It decides
            everything that matters: the subject, the concept, the medium, the
            composition, and what the work means. It writes its own description
            of the piece, and that description is rendered into an image exactly
            as it was written, with nothing changed. What you see is what the
            Normie asked for, nothing more.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <SectionLabel>What We Control and What We Don&apos;t</SectionLabel>
          <div className="h-px bg-[#0a0a0a] w-full" />
          <p className={TYPE.prose}>
            Our guidance is about craft, not content: be specific rather than
            vague, avoid the habits that make work feel generic, and stay within
            basic content-safety limits. We don&apos;t choose the subject, the
            medium, or what a piece means. We do set a floor for what counts as
            deliberate, readable work.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <SectionLabel>Datagrams</SectionLabel>
          <div className="h-px bg-[#0a0a0a] w-full" />
          <p className={TYPE.prose}>
            Data as Medium. A growing series by Spoliticus, built on a simple
            belief: data isn&apos;t just information, it&apos;s material. Every
            dataset carries a shape worth seeing. Each week, one new artwork is
            generated from the activity of the Normies Pixel Market. Last
            week&apos;s activity decides the theme, and this week&apos;s numbers
            decide how much of it appears, so the work fills in day by day as
            the week unfolds. A new piece arrives every Monday.
          </p>
        </div>
      </section>
    </main>
  );
}
