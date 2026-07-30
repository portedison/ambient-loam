import TerrainViewer, { type MarkerAnchor } from "@/components/TerrainViewer";
import { fetchCollectionImage } from "@/lib/collection";

const CITE =
  "After McCully McEvedy et al., Records of the Canterbury Museum 34 (2020)";

// Editorial marker config. Text is paraphrased from the publication; each
// marker's image is fetched live from the Canterbury Museum collection API
// (server-side) by its object id — nothing about the image is hardcoded here.
type MarkerSeed = Omit<MarkerAnchor, "image"> & {
  /** Canterbury Museum collection object id (opacObjectId). */
  collectionId: string;
  /** Alt text for the fetched image. */
  imageAlt: string;
};

const MARKER_SEEDS: MarkerSeed[] = [
  {
    id: "mouth",
    lng: 171.14,
    lat: -44.93,
    label:
      "Killing sites, where moa were either slaughtered or incapacitated by having their legs broken to stop them wandering away and to preserve the freshness of their flesh.",
    cite: CITE,
    collectionId: "1179098", // Glass Plate Negative: Moa bones
    imageAlt: "Glass plate negative of moa bones",
  },
  {
    id: "upstream",
    lng: 170.48,
    lat: -44.72,
    label:
      "The hinterland, where Māori hunted the moa, before carcases and trussed live moa were transported downstream on mōkihi.",
    cite: CITE,
    collectionId: "337989", // Glass Plate Negative: Mōkihi
    imageAlt: "Glass plate negative of a mōkihi on saw horses, Timaru",
  },
];

export default async function Home() {
  const markers: MarkerAnchor[] = await Promise.all(
    MARKER_SEEDS.map(async ({ collectionId, imageAlt, ...seed }) => {
      const image = await fetchCollectionImage(collectionId, imageAlt);
      return image ? { ...seed, image } : seed;
    }),
  );

  return (
    <main className='relative h-dvh w-screen overflow-hidden bg-[#090b0f]'>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src='/logo-home.svg'
        alt=''
        width={150}
        height={49}
        className='pointer-events-none absolute left-6 top-6 z-20 w-[150px] select-none'
      />

      <header className='pointer-events-none absolute inset-x-0 top-20 z-10 flex flex-col items-center gap-2 px-6 text-center sm:top-6'>
        <h1
          className='select-none font-display text-5xl font-black text-white sm:text-6xl md:text-7xl'
          style={{ textShadow: "0 2px 24px rgba(0, 0, 0, 0.55)" }}
        >
          Moa on Mōkihi
        </h1>
        <p
          className='max-w-md text-sm leading-relaxed text-white/70'
          style={{ textShadow: "0 1px 12px rgba(0, 0, 0, 0.6)" }}
        >
          Hugh McCully&rsquo;s theory that moa were floated downstream on mōkihi,
          mapped to the Waitaki.{" "}
          <a
            href='https://cms.canterburymuseum.com/assets/McCully-McEvedy-et-al-2020.pdf?v=1678151739'
            target='_blank'
            rel='noopener noreferrer'
            className='pointer-events-auto font-medium text-white underline underline-offset-2 hover:text-white/80'
          >
            Read the source paper
          </a>
          .
        </p>
      </header>

      <TerrainViewer markers={markers} className='absolute inset-0 h-full w-full' />
    </main>
  );
}
