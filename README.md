# MH370 Interactive Evidence Globe

An interactive 3D globe that lays out the verified public evidence around Malaysia Airlines Flight 370, which disappeared on the morning of 8 March 2014. It brings the flight data, satellite handshakes, recovered debris, search campaigns, seabed survey and candidate crash sites into one map you can explore, replay on a clock, or read through as a database.

Everything on the map traces back to a primary source. Each point, ring, track and search area carries its own citation, an epistemic label (recorded, derived, or modelled), and, where a properly licensed image or clip exists, a piece of media.

## What it does

- **Explore mode.** Pan and zoom a globe that flattens to a map as you descend. Toggle layers on and off, click any feature for a detail panel with its data, sources and media.
- **Flight mode.** Scrub a flight clock from takeoff to the final satellite log-on and watch the recorded track, the military radar leg, the seven timing rings and the candidate reconstructions in time.
- **Database mode.** The same evidence as a chronological, linkable list, each entry pointing at its source.
- **Layered evidence.** Recorded ADS-B and military radar tracks, the seven Inmarsat arcs plus the contested CAPTIO extra ring, four named final-hours reconstructions, ten search campaigns from 2014 to the 2025 to 2026 Ocean Infinity effort, thirty-plus debris finds styled by identification status, bathymetry, and candidate impact sites.
- **Deep linking.** The full view (mode, camera, time, visible layers, selected feature) lives in the URL, so any state can be shared or reloaded exactly.
- **Offline-friendly media.** Image and audio payloads are mirrored into the repo wherever a freely usable file exists, so there are no dead hotlinks. Video, and the one air traffic control clip that has no free-licensed file, stay as remote embeds.

All times shown to the reader are Kuala Lumpur local (UTC+8), the flight's departure zone. Raw UTC is kept in the source data and converted only at display time.

## The data

Raw, hand-sourced data lives in `data/` as plain JSON, each file annotated with the sources it was built from (Inmarsat SATCOM logs, the Ashton et al. 2015 paper, the Malaysian Safety Investigation Report, ATSB and MOT reports, CSIRO drift studies, and the independent-group reconstructions).

A build step compiles that into render-ready GeoJSON under `src/data/`:

```
data/*.json  ->  scripts/build-data.ts  ->  src/data/*.geojson.json
```

The build computes the timing rings from the BTO measurements, anchors the reconstructions to the last radar fix, validates coordinates and dates, and checks every feature against a shared schema. If the data drifts out of shape, the build fails rather than shipping something wrong. The app loads the generated GeoJSON, parses it back into one typed `DataPoint` union, and every consumer works off that type.

Run `pnpm data` after editing anything in `data/`.

## Media and licensing

The code is open source. Media is licensed per file, and `MEDIA-CREDITS.md` is the authoritative record.

- Most images come from Wikimedia Commons under Creative Commons or public domain terms, each verified and attributed in the app.
- A few are official report figures (for example Malaysia MOT debris photos). Those are copyrighted and included under editorial use, marked clearly as not open source both in the manifest and in the credits file.
- Where no free photo of the exact object exists, a representative image of the same type is used and its caption says so explicitly, so it never reads as the real thing.

## Tech stack

React 19, TypeScript, Vite, MapLibre GL for the globe, Zustand for state, Zod for the data schema, and ts-pattern for typed dispatch. Tests run on Vitest, linting on Oxlint.

## Getting started

You need [pnpm](https://pnpm.io) and Node.js. The data build (`pnpm data`) uses native TypeScript execution, so Node 23.6 or newer is required for that script; the dev server and production build run on current Node.

```bash
pnpm install     # install dependencies
pnpm dev         # start the dev server (http://localhost:5173)
pnpm build       # type-check and build for production
pnpm preview     # preview the production build
```

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Vite dev server with hot reload |
| `pnpm build` | `tsc -b` type-check, then a production Vite build |
| `pnpm preview` | Serve the production build locally |
| `pnpm data` | Recompile `data/` into the GeoJSON under `src/data/` |
| `pnpm test` | Run the Vitest suite once |
| `pnpm test:watch` | Vitest in watch mode |
| `pnpm lint` | Oxlint |

## Project layout

```
data/            raw sourced JSON (the inputs)
scripts/         build-data.ts, the compile step
public/media/    mirrored images and audio
src/
  config/        layer registry, palette, evidence, events
  data/          generated GeoJSON, the DataPoint schema, typed collections
  lib/           formatting, geodesy, badge and display helpers
  map/            MapLibre basemap, data layers, interactions
  state/          selection, clock, view, URL sync (Zustand stores)
  ui/             detail panel, legend, timeline, database, and other views
  styles/         theme and layout CSS
  types/          module declarations for the generated data
```

## Testing

The Vitest suite sits next to the code it covers. It pins the geodesy and the compiled data (unique ids, sorted order, valid dates and URLs, cross-references that resolve, the arc geometry against published anchors) so a regression in the pipeline is caught immediately. WebGL and map rendering are checked by driving the running app in headless Chrome rather than in unit tests.

## A note on the content

This is an independent compilation of public evidence for education and reference. It is not an official source and takes no position beyond what the cited reports and analyses state. Contested material (for example the WSPR reconstruction) is included but labelled as such.
