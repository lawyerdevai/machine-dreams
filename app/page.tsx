import Image from "next/image";
import Link from "next/link";
import { getValidArtworks } from "@/lib/redis";
import { agentImageUrl } from "@/lib/normies";
import { LandingNav } from "@/app/components/landing-hero";
import { NormiePfpBadge } from "@/app/components/normie-pfp-badge";
import { DataCharGrid } from "@/app/components/data-char-grid";
import DataForest from "@/components/data-forest/DataForest";
import { TYPE } from "@/lib/typography";
import type { Artwork } from "@/lib/types";

const PREVIEW_COUNT = 12;
/** Set true to show the Data as Medium / Datagrams block on the home page. */
const SHOW_DATAGRAMS_SECTION = false;

type ProjectButton = {
  label: string;
  href?: string;
  disabled?: boolean;
};

type HomeProject = {
  id: string;
  title: string;
  description: string;
  /** Which side the picture sits on at desktop width. */
  layout: "text-left" | "picture-left";
  buttons: ProjectButton[];
};

const PROJECTS: HomeProject[] = [
  {
    id: "normies",
    title: "Normies Artworks",
    description:
      "Each awakened Normie is given one canvas and one chance to make a single work from the truth of who they are. What they write is rendered exactly as asked, nothing touched afterward.",
    layout: "text-left",
    buttons: [
      { label: "Create", href: "/find" },
      { label: "Gallery", href: "/gallery?category=normie" },
    ],
  },
  {
    id: "arena",
    title: "Arena Murals",
    description:
      "At the end of each Arena season, the record of that world becomes one mural: the wars, the deaths, the elections. One season, one wall.",
    layout: "picture-left",
    buttons: [{ label: "Coming Soon", disabled: true }],
  },
];

export const dynamic = "force-dynamic";

function sectionLabel(n: number) {
  return String(n).padStart(2, "0");
}

function ProjectButtons({ buttons }: { buttons: ProjectButton[] }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {buttons.map((button) =>
        button.disabled || !button.href ? (
          <button
            key={button.label}
            type="button"
            disabled
            aria-disabled="true"
            className="btn-minimal cursor-default opacity-40 hover:bg-white hover:text-[#0a0a0a]"
          >
            {button.label}
          </button>
        ) : (
          <Link key={button.label} href={button.href} className="btn-minimal">
            {button.label}
          </Link>
        )
      )}
    </div>
  );
}

function ArenaPaper() {
  return (
    <div className="relative aspect-square w-full max-w-[28rem] overflow-hidden border border-[#0a0a0a] bg-[#f2ead8]">
      <Image
        src="/arena-portrait.png"
        alt="Black ink figure with a headband, mid-strike on cream paper"
        fill
        sizes="(max-width: 800px) 100vw, 28rem"
        className="object-cover"
      />
    </div>
  );
}

function sampleArtworks(artworks: Artwork[], size: number): Artwork[] {
  const copy = [...artworks];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(size, copy.length));
}

export default async function Home() {
  const artworks = await getValidArtworks();
  const previewArtworks = sampleArtworks(artworks, PREVIEW_COUNT);
  let sectionCount = 0;
  const datagramsNumber = SHOW_DATAGRAMS_SECTION ? ++sectionCount : 0;
  const projects = PROJECTS.map((project) => ({
    ...project,
    number: ++sectionCount,
  }));

  return (
    <div className="flex flex-1 flex-col min-h-screen bg-white">
      <LandingNav />
      <div
        className="w-full overflow-hidden"
        style={{ height: "max(360px, min(667px, 60vw))" }}
      >
        <DataForest />
      </div>

      {/* Data as Medium — hidden while SHOW_DATAGRAMS_SECTION is false */}
      {SHOW_DATAGRAMS_SECTION ? (
      <section className="w-full px-6 pt-8 md:pt-10 pb-14 md:pb-20">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-12 items-center">
          <div className="w-full min-w-0 order-2 md:order-1">
            <DataCharGrid />
          </div>
          <div className="flex flex-col gap-5 md:gap-6 order-1 md:order-2">
            <div className="flex flex-col gap-2">
              <span className="font-mono text-[72px] md:text-[120px] leading-none font-normal text-[#e8e8e8] select-none">
                {sectionLabel(datagramsNumber)}
              </span>
              <h2 className="page-title uppercase text-2xl md:text-3xl tracking-wide">
                Data as Medium
              </h2>
            </div>
            <p className={`${TYPE.proseSm} text-[#666] max-w-md`}>
              A growing series built on a simple belief: data isn&apos;t just
              information, it&apos;s material. Every dataset carries a shape
              worth seeing.
            </p>
            <div>
              <Link href="/datagrams" className="btn-minimal">
                Datagrams
              </Link>
            </div>
          </div>
        </div>
      </section>
      ) : null}

      {projects.map((project) => {
        const isFirst = project.number === 1;
        const picture =
          project.id === "normies" ? (
            previewArtworks.length > 0 ? (
              <div className="grid grid-cols-3 md:grid-cols-4 gap-1.5 max-md:gap-1 w-full max-md:max-w-[17.5rem] max-md:justify-self-start md:max-w-[28rem] md:justify-self-end max-md:[&>*:nth-child(n+7)]:hidden">
                {previewArtworks.map((artwork) => (
                  <Link
                    key={artwork.tokenId}
                    href={`/artwork/${artwork.tokenId}`}
                    className="relative aspect-square overflow-hidden bg-[#0a0a0a] transition-opacity hover:opacity-85"
                  >
                    <Image
                      src={artwork.imageUrl}
                      alt={artwork.title}
                      fill
                      sizes="(max-width: 768px) 28vw, 112px"
                      className="object-cover"
                    />
                    <NormiePfpBadge src={agentImageUrl(artwork.tokenId)} />
                  </Link>
                ))}
              </div>
            ) : null
          ) : (
            <ArenaPaper />
          );
        const copy = (
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-2">
              <span className="font-mono text-[72px] md:text-[120px] leading-none font-normal text-[#e8e8e8] select-none">
                {sectionLabel(project.number)}
              </span>
              <h2 className="page-title uppercase text-2xl md:text-3xl tracking-wide">
                {project.title}
              </h2>
            </div>
            <p className={`${TYPE.proseSm} text-[#666] max-w-md`}>
              {project.description}
            </p>
            <ProjectButtons buttons={project.buttons} />
          </div>
        );

        return (
          <section
            key={project.id}
            className={
              isFirst
                ? "w-full px-6 pt-8 md:pt-10 pb-14 md:pb-20"
                : "w-full border-t border-[#0a0a0a] px-6 py-10 md:py-14"
            }
          >
            <div
              className={`max-w-6xl mx-auto grid grid-cols-1 gap-10 min-[800px]:grid-cols-2 min-[800px]:gap-12 ${
                project.layout === "picture-left" ? "items-center" : "items-start"
              }`}
            >
              {project.layout === "picture-left" ? (
                <>
                  {picture}
                  {copy}
                </>
              ) : (
                <>
                  {copy}
                  {picture}
                </>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
