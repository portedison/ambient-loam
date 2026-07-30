# Moa on Mōkihi

**An interactive 3D retelling of one object's story, drawn from Canterbury Museum's own collection and research.**

> In 1950, two elderly men — the pioneering archaeologist **Hugh McCully** and **Pita Paipeta** (Peter Piper) of Arowhenua — built a **mōkihi**, a watercraft bundled from raupō reeds, in a Timaru backyard and presented it to Canterbury Museum. The craft mattered because of a theory McCully had spent decades forming: that the moa hunted in the dry interior of Te Wai Pounamu (the South Island) were floated **downstream** to butchery sites on the coast aboard exactly this kind of cheap, single-use reed raft. *Moa on Mōkihi* puts that story back into the landscape where it happened.

---

## The objective

Tell one focused story well: **the role of the mōkihi, and how McCully arrived at the "moa-on-mōkihi" theory.**

The mōkihi is the thread. It is almost invisible in the historical record precisely *because* it worked so well — a raupō raft was built on the riverbank in a day, ridden downstream once, and left to rot. Nothing survived. That impermanence is why the skill was nearly lost by 1950, why McCully felt compelled to rebuild one, and why the object now sits in the Museum at all.

The theory is the payoff. From moa bones and anchor stones eroding out of the Waitaki River mouth, McCully reasoned *backwards*: the birds were hunted far up the river's dry hinterland, then their carcasses were floated down to the coast to be preserved and traded north. The elevation of the valley — mountains draining to the sea — *is* the argument. So the experience is built on that terrain.

## What it does

- Renders the **real terrain of the lower Waitaki valley** in 3D — coast in the south-east, ranges climbing to the north-west — from open elevation data.
- Anchors **annotated points** to actual geographic locations on that terrain: the upstream hunting country and the river-mouth site, each captioned from the Museum publication and cited to it.
- Lets the visitor **orbit, pan and zoom** the landscape, reading the story against the geography that makes it make sense.

## Intended user & the need it addresses

**Primary user:** a curious museum visitor (in-gallery or online), and secondarily the Museum's digital/education team.

**The need:** a catalogue record is terse. *"Glass Plate Negative: Mōkihi. One black and white glass plate negative depicting a mōkihi sitting on two saw horses in Timaru."* — that is the entire structured record for the object at the heart of this story. The meaning lives elsewhere, in a research journal few visitors will ever open. This prototype bridges that gap: it takes the narrative locked in a publication and binds it to place, so a single thin record opens onto the landscape, the people, and the idea behind it.

## How it connects structured collection data with unstructured research

This is the core of the brief — connecting **structured** collection records to **unstructured** narrative from a Museum source.

- **Unstructured (built):** *Hugh McCully's 'mogie'* — McCully McEvedy R, Seymour M & McCully A. 2020. *Records of the Canterbury Museum* **34**: 25–33. The map's captions are paraphrased from this paper and cited to it; the whole narrative spine (the theory, the hunting-to-butchery journey, the makers) comes from it.
- **Structured (mapped & retrieved; UI integration is the next step):** the Canterbury Museum collection API (Vernon Systems / eHive OPAC v3, `/api/v3/opacobjects`). The relevant objects were located and their schema mapped — the 1950 mōkihi glass-plate negative (**object 337989**) and the Museum's moa-bone glass-plate negatives (skulls, mandibles, a pelvis — ~160 moa records, most with images). Surfacing those object images *in the scene*, pinned to the story beats, is the first item under **What's next**.

So today the prototype delivers the unstructured→place half end-to-end, with the structured collection layer researched and staged. See *Design decisions* for why the narrative half was built first in the time available.

## Data & sources (all no-key / open)

| Layer | Source | Notes |
|---|---|---|
| Elevation | **AWS Terrain Tiles** (Terrarium encoding, `elevation-tiles-prod`, AWS Open Data) | z10 4×4 block over the lower Waitaki, ~110 m/px, decoded client-side to a heightmap. No key. |
| Satellite imagery | **Esri World Imagery** (ArcGIS Online) | Draped as the terrain texture. Attribution: Esri, Maxar. Demo use — swap for LINZ aerial in production. |
| Narrative | **Records of the Canterbury Museum 34 (2020)** | Source PDF in [`data/publication/`](data/publication). |
| Objects | **Canterbury Museum collection API** (Vernon/eHive v3) | Structured records + image derivatives; staged for integration. |

*Also explored but not in the final UI:* GBIF & iNaturalist (raupō / *Typha orientalis* occurrences — the plant the craft is made from) and DigitalNZ (a keyless national aggregator with 170+ "mokihi" records) as enrichment sources for a later pass.

## Design & engineering decisions

- **Narrative cartography over semantic search (for now).** My first instinct was a semantic-search bridge between records and publications. In a two-hour box, a curated 3D narrative is more demonstrable *and* more honest to this particular story — the elevation gradient literally carries the argument. Semantic search becomes the headline "next" (below).
- **Pure three.js, not react-three-fiber.** The scene is a single imperative terrain mesh plus controls; r3f's reconciler would add a dependency and abstraction for little gain. It's wrapped in one typed React client component with full setup/teardown.
- **WebGL, not WebGPU.** This is a public submission opened in arbitrary browsers, so WebGL2's universal support wins; the scene is nowhere near GPU-bound, and WebGPU would mean a TSL/node-material rewrite. `WebGPURenderer` (with its WebGL2 fallback) is the path if we later add GPU-compute terrain LOD.
- **True-scale elevation ×2.** Height is mapped from real metres at the tile's true horizontal scale, then exaggerated a modest ×2 — so ridgelines are faithful, not the caricatured spikes an arbitrary multiplier produces.
- **No API keys, runs offline-of-secrets.** DEM + imagery tiles are fetched and stitched in the browser; `pnpm install && pnpm dev` just works, nothing to configure.
- **Marker occlusion** is raycast against the terrain (throttled to every 4th frame); a dot behind a ridge hides. `three-mesh-bvh` would make this free at scale.
- **Composition trim.** A slice is cropped off the eastern edge of the mesh so the block sits centred in frame.

## Assumptions

- **Archaeological site coordinates are deliberately *not* pinpointed.** Precise moa-hunter / midden locations are access-restricted (NZAA ArchSite) for good reason — looting, and respect for wāhi tapu. Markers are **approximate and named-place based**, not survey points.
- **Captions are paraphrased and attributed**, not passed off as verbatim quotation, and drawn only from the one Museum publication.
- **Small, representative sample.** One valley, one publication, two locations — enough to prove the idea, per the brief.
- Requires internet at runtime (it fetches open map tiles); precomputing them to `/public` is a listed next step.

## What I'd build next (with more time)

1. **Wire the structured collection into the scene** — surface object 337989 (the 1950 mōkihi negative) and the moa-bone negatives from the API as artefacts pinned to the story beats, closing the structured↔unstructured loop visually.
2. **Semantic search** — embed collection records and publication passages so *any* object can auto-surface the research that explains it (the original idea, now generalised beyond one hand-built story).
3. **Full scrollytelling journey** — extend to the 1950 making in Timaru and the two makers (McCully and Paipeta), including the cultural dimension the paper raises: the draining of mahinga kai (food-gathering wetlands) that erased the very raupō the craft is made from.
4. **Authoritative NZ data** — swap Esri imagery for LINZ aerial and the Terrarium DEM for LINZ 8 m / 1 m LiDAR; precompute tiles to `/public` for offline, instant load.
5. **Deploy + accessibility** — ship to Vercel; add keyboard controls, `prefers-reduced-motion`, and a text/list fallback for the map so the content is reachable without WebGL.

## Running it

Requires **Node 22+** and **pnpm**. (An internet connection is needed the first time — the terrain and imagery tiles are fetched from open sources at runtime.)

```bash
pnpm install
pnpm dev
```

Then open [http://localhost:3000](http://localhost:3000). Drag to orbit, right-drag (or arrow keys) to pan, scroll to zoom.

Other scripts: `pnpm build`, `pnpm start`, `pnpm lint`.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript (strict) · three.js r185 (WebGL) · Tailwind CSS v4.

## AI-assisted tools

Built with **Claude Code** (Claude Opus), used as a pair-programmer and research assistant. Specifically:

- **Data reconnaissance** — probing and mapping the Canterbury Museum (Vernon/eHive) API schema, and vetting candidate data sources (Terrarium DEM incl. its CORS behaviour, Esri imagery, GBIF/iNaturalist, DigitalNZ) before committing to any.
- **Reading the source** — summarising the McCully McEvedy et al. (2020) PDF and locating the exact passages used, which I verified against the paper.
- **Implementation** — scaffolding the Next.js + TypeScript app and writing the pure-three.js `TerrainViewer` (heightmap decode, plane displacement, screen-projected marker overlay, occlusion), iterating on exaggeration, camera framing and the edge trim against a live browser preview.

All framing, scoping and editorial decisions — what story to tell, which sources to trust, how locations are represented — are my own.

## Glossary

**mōkihi** — a traditional Māori watercraft of bundled raupō (and harakeke bindings) · **raupō** — bullrush (*Typha orientalis*) · **harakeke** — flax · **moa** — the extinct giant flightless birds · **mahinga kai** — traditional food-gathering places · **Te Wai Pounamu** — the South Island.

## Attribution & licence

Story and quotations © the authors of *Records of the Canterbury Museum* 34 (2020); used here under a small, cited, educational sample for a technical exercise. Collection metadata © Canterbury Museum. Elevation: AWS Terrain Tiles (Open Data). Imagery: Esri, Maxar. This prototype was produced as a recruitment exercise and is not affiliated with or endorsed by Canterbury Museum.
