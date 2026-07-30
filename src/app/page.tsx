import TerrainViewer, { type MarkerAnchor } from "@/components/TerrainViewer";

// Paraphrased from: McCully McEvedy R, Seymour M, McCully A. 2020.
// "Hugh McCully's 'mogie'." Records of the Canterbury Museum 34: 25–33.
// Module-level so the reference stays stable across renders.
const MARKERS: MarkerAnchor[] = [
  {
    id: "mouth",
    lng: 171.14,
    lat: -44.93,
    label:
      "Killing sites, where moa were either slaughtered or incapacitated by having their legs broken to stop them wandering away and to preserve the freshness of their flesh.",
    cite: "After McCully McEvedy et al., Records of the Canterbury Museum 34 (2020)",
  },
  {
    id: "upstream",
    lng: 170.48,
    lat: -44.72,
    label:
      "The hinterland, where Māori hunted the moa, before carcases and trussed live moa were transported downstream on mōkihi.",
    cite: "After McCully McEvedy et al., Records of the Canterbury Museum 34 (2020)",
  },
];

export default function Home() {
  return (
    <main className='relative h-dvh w-screen overflow-hidden bg-[#090b0f]'>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src='/logo-home.svg'
        alt=''
        width={150}
        height={49}
        className='pointer-events-none absolute left-6 top-6 w-[150px] select-none'
      />

      <h1
        className='pointer-events-none absolute inset-x-0 top-20 z-10 select-none text-center font-display font-black text-5xl text-white sm:top-6 sm:text-6xl md:text-7xl'
        style={{ textShadow: "0 2px 24px rgba(0, 0, 0, 0.55)" }}
      >
        Moa on Mōkihi
      </h1>

      <TerrainViewer markers={MARKERS} className='absolute inset-0 h-full w-full' />
    </main>
  );
}
