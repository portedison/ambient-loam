# Moa on Mōkihi

An interactive 3D map of the lower Waitaki that connects a **Canterbury Museum collection object** (fetched via the collection API) with the **Museum publication** that explains it — telling the story of the mōkihi and Hugh McCully's "moa-on-mōkihi" theory.

## Running the prototype

Requires **Node 22+** and **pnpm**, plus an internet connection (it fetches open map tiles and the collection API at run time).

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Drag to orbit, right-drag or arrow keys to pan, scroll to zoom.

## Intended user & the need it addresses

A museum visitor, in-gallery or online. A catalogue record is terse — the glass-plate negative of a mōkihi is a single line of text — while the story that gives it meaning sits in a research paper almost no visitor will open. *Moa on Mōkihi* binds the two together, in the landscape where the story happened.

## Decisions & assumptions

- **Structured + unstructured.** The structured side is Canterbury Museum collection objects fetched from the collection API (the mōkihi and moa-bone glass-plate negatives); the unstructured side is *"Hugh McCully's 'mogie'," Records of the Canterbury Museum* 34 (2020). Marker captions are paraphrased from the paper and cited to it.
- **A 3D map, not semantic search.** Semantic search was my first instinct, but in the time available a curated 3D narrative is more convincing — and the valley's elevation gradient literally *is* the "float the moa downstream" argument.
- **Pure three.js on WebGL**, Next.js 16 + TypeScript (strict). WebGL for portability (reviewers' browsers vary) and because the scene isn't GPU-bound.
- **Real, open elevation** (AWS Terrain Tiles), exaggerated ×2 for legibility; the collection API is called server-side and cached.
- **Locations are approximate.** Precise archaeological site coordinates are deliberately not used — they are access-restricted and culturally sensitive; markers sit on named places.
- **A small, representative sample**: one valley, one paper, two objects — enough to prove the idea.

## What I would build next

- **Semantic search**, so *any* collection record can auto-surface the passage that explains it (the original idea, generalised).
- **More of the story**: the 1950 rebuild in Timaru, its makers (McCully and Pita Paipeta), and the loss of the mahinga kai where the raupō grew.
- **Authoritative, offline data**: vendor the map tiles and swap in LINZ aerial + LiDAR; deploy; add keyboard controls, reduced-motion and a text fallback for accessibility.

## AI-assisted tools

Built with **Claude Code** (Claude Opus) as a pair-programmer: reconnaissance of the collection API and candidate data sources, summarising the source PDF, scaffolding the Next.js + TypeScript app, writing the three.js terrain viewer and the server-side collection fetch, and iterating on the look against a live browser preview. The editorial and scoping decisions are mine, and quotations were checked against the source paper.
