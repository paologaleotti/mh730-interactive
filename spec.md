# MH370 Interactive Evidence Globe — Functional Specification

**Version:** 1.1 · **Scope:** Functional requirements only (no implementation, styling, or technology mandates)
**Changelog:** v1.1 — added Appendix B (verified source download inventory, July 2026); corrected Epoch 1 source (no free raw ADS-B dataset exists); reclassified davetaz/mh370-data repo as SATCOM log mirror (validated).
**Product:** A single-page interactive 3D globe presenting the verified evidence of Malaysia Airlines Flight 370 (8 March 2014): flight data, satellite data, radio and hydroacoustic audio, debris findings, drift modelling, seabed survey data, and complete search history through the current agreement (extended to 30 June 2027).

---

## 1. Guiding principles

- **P1 — Evidence-first.** Every element on screen is traceable to a primary source. Reconstructed or illustrative content is always visually and textually distinguished from recorded data.
- **P2 — Confidence styling.** Data is rendered according to its epistemic status: *recorded* (solid), *derived* (dashed/outlined), *modelled or illustrative* (distinct treatment + explicit label).
- **P3 — One master clock.** A single UTC timeline (2014-03-07 16:00 UTC → 2014-03-08 01:30 UTC for the flight; an extended calendar timeline for searches/debris) drives all animation, audio, captions, and camera choreography.
- **P4 — Progressive disclosure.** At globe scale the user sees the story's shape; detail (labels, events, media) reveals as the camera descends or the story advances.
- **P5 — Fast by default.** No interaction is blocked on media loading; all media loads lazily and degrades gracefully.

---

## 2. Definitions

- **Epoch 1:** ADS-B / secondary radar segment, 16:42–17:21 UTC (recorded positions).
- **Epoch 2:** Military primary radar segment, 17:21–18:22 UTC (recorded, lower precision).
- **Epoch 3:** SATCOM-only period, 18:25–00:19 UTC (no positions; 7 BTO-derived arcs).
- **Handshake (HS1–HS7):** Inmarsat log-on/interrogation events defining the arcs.
- **POI:** A named, clickable point of interest with label, category, rank, and detail panel.
- **Chapter:** A step in Story Mode binding camera position, timeline range, active layers, and media.

---

## 3. Application modes

### 3.1 Explore Mode (default)
- FR-3.1.1 Free camera: rotate, tilt, zoom from full globe to maximum data resolution, seamlessly (globe ↔ flat transition is automatic and unnoticeable).
- FR-3.1.2 All layers individually toggleable via a layer panel; each layer shows a one-line description and a source citation link.
- FR-3.1.3 Timeline scrubber always available (§6).
- FR-3.1.4 Any POI, debris item, arc, polygon, or path segment is clickable → opens the Detail Panel (§9).
- FR-3.1.5 Current view is fully encoded in the URL (§13); reload restores it exactly.

### 3.2 Story Mode (guided)
- FR-3.2.1 A linear, chaptered narrative (§10) advanced by scroll, click, or arrow keys.
- FR-3.2.2 Each chapter transition executes a scripted camera flight, sets the timeline window, activates the required layers, and (optionally) cues media.
- FR-3.2.3 The user may interrupt at any point: any manual camera/timeline interaction pauses the story and offers "Resume story" / "Switch to Explore."
- FR-3.2.4 Chapters are individually deep-linkable.

### 3.3 Evidence Library
- FR-3.3.1 A browsable index of every source: reports, datasets, audio items, video items, each with description, date, publisher, and outbound link.
- FR-3.3.2 Every library item cross-links to the map feature(s) it supports ("Show on globe").

---

## 4. Globe & basemap

- FR-4.1 True 3D globe at low zoom; standard map at high zoom; continuous transition.
- FR-4.2 Basemap includes legible, collision-managed labels: countries, cities, ocean/sea names, at all zooms.
- FR-4.3 A dark/subdued basemap style is the default so evidence layers dominate visually; a light style toggle is available.
- FR-4.4 Live cursor readout: lat/lon always; water depth (from bathymetry data) when over surveyed seabed.
- FR-4.5 Scale bar and north indicator; attribution for all data sources permanently accessible.

---

## 5. Data layers

Each layer defines: content, default visibility, interactive behaviors, and confidence styling.

### 5.1 Flight path
- FR-5.1.1 Epoch 1 rendered as a solid line from recorded ADS-B positions (WMKK departure → IGARI), with per-point time/alt/speed available on hover.
- FR-5.1.2 Epoch 2 rendered as a dashed line from the published military radar track (turnback → Strait of Malacca → last fix past MEKAR).
- FR-5.1.3 Epoch 3 shows **no single path by default.** Instead: the 7 arcs (§5.2) plus a toggleable "Candidate reconstructions" sub-layer containing ≥2 named, cited reconstructions (e.g., ATSB analysis, independent-group path), each clearly labeled *reconstruction*.
- FR-5.1.4 During timeline playback, an aircraft marker animates along Epochs 1–2; in Epoch 3 the marker is replaced by an expanding "position unknown" indication constrained to the active arc at each handshake time.
- FR-5.1.5 Event markers on the path: last ACARS transmission, transponder loss (17:21), last voice contact (17:19:30), last primary radar (18:22), each handshake, final log-on (00:19). Each is a POI (§9).

### 5.2 Inmarsat arcs
- FR-5.2.1 Seven arcs (HS1–HS7) rendered as derived-confidence lines, individually labeled with UTC time.
- FR-5.2.2 The 7th arc is visually emphasized (it constrains all search areas).
- FR-5.2.3 Clicking any arc opens an explainer: what a BTO measurement is, the raw value for that handshake, and how it maps to a ring — including a link to the released SATCOM log and the published methodology.
- FR-5.2.4 Optional overlay: satellite position indicator (Inmarsat-3F1 sub-satellite point) with a sightline to the active arc during playback.

### 5.3 Search history
- FR-5.3.1 Polygons for: 2014 surface search areas (South China Sea, Andaman, southern Indian Ocean phases); 2014–2017 ATSB underwater area (120,000 km²); 2018 Ocean Infinity area; 2025–26 Ocean Infinity 15,000 km² zone with the ~7,571 km² actually surveyed distinguished from the remainder; the residual ~7,428 km² pending under the agreement extended to 30 June 2027.
- FR-5.3.2 Color/label per campaign; a campaign filter (checkbox per campaign or "sweep through time" via the calendar timeline).
- FR-5.3.3 Clicking a polygon → Detail Panel: dates, operator, vessels/vehicles, area covered, outcome, source report.

### 5.4 Bathymetry (seabed)
- FR-5.4.1 Hillshaded, hypsometrically colored seabed rendering covering: global context (coarse), the full Phase 1 survey footprint (native ~40–110 m resolution), and available high-resolution patches (native resolution).
- FR-5.4.2 Level-of-detail is automatic with zoom; each dataset is rendered to (and not beyond) its native resolution; coarse data fills gaps seamlessly.
- FR-5.4.3 Opacity slider; "seabed only" view option that dims all land.
- FR-5.4.4 Named seafloor features (Broken Ridge, Diamantina Escarpment, Geelvinck Fracture Zone, etc.) as POIs that appear at appropriate zooms.
- FR-5.4.5 Optional 3D relief: vertically exaggerated seabed terrain with an exaggeration slider (clearly labeled with the multiplier).
- FR-5.4.6 Depth-under-cursor readout wherever elevation-encoded data exists (§4.4).

### 5.5 Debris
- FR-5.5.1 One point per recovered item (~30+), placed at the documented find location, with properties: find date, discoverer, part identification, official confirmation status (*confirmed / highly likely / likely / unidentifiable*), examining authority, report link, photo where publicly available.
- FR-5.5.2 Filter by confirmation status and by date range; points appear chronologically when the calendar timeline plays.
- FR-5.5.3 Clicking a debris point → Detail Panel with all properties and a "Show drift paths to here" action (activates §5.6 filtered to that item).
- FR-5.5.4 Marker styling encodes confirmation status.

### 5.6 Drift modelling
- FR-5.6.1 Animated modelled drift trajectories (published oceanographic study outputs) from candidate 7th-arc origins toward the western Indian Ocean, styled and labeled as *modelled*.
- FR-5.6.2 Playable over the calendar timeline (months–years scale) with a speed control; debris find events (§5.5) pop as the animation passes their dates.
- FR-5.6.3 Explainer panel: what the model shows, what it does and doesn't prove, source citation.

### 5.7 POI & labels
- FR-5.7.1 Categories: airports, flight waypoints, event markers, handshake labels, debris sites, seafloor features, search-zone labels, hydroacoustic stations (e.g., HA01 Cape Leeuwin), satellite sub-point.
- FR-5.7.2 Every POI: icon + text label, collision-managed, halo for legibility, zoom-ranked visibility (rank 1 visible at globe scale; lower ranks appear as zoom increases).
- FR-5.7.3 Hover → tooltip (name + one-liner). Click → Detail Panel (§9).
- FR-5.7.4 A POI search box: type-ahead over all POI names; selecting one flies the camera to it and opens its panel.

---

## 6. Timeline & playback

- FR-6.1 Two linked time scales, switchable: **Flight clock** (minutes/hours of 7–8 March 2014, UTC, with local-time secondary display) and **Calendar** (2014 → present, for searches, debris, drift).
- FR-6.2 Scrubber with: play/pause, playback speeds (e.g., 1×, 60×, 600× for flight; days/second for calendar), step-to-next-event buttons, and event tick marks on the track (each tick labeled on hover, clickable to jump).
- FR-6.3 The master clock drives, in sync: aircraft marker position, arc highlighting, audio cue points, caption highlighting, camera choreography (Story Mode), debris/search appearance (calendar), and drift animation.
- FR-6.4 Scrubbing while audio is playing seeks the audio to the corresponding cue point or stops it if the new time is outside the clip's span (§8.1.6).
- FR-6.5 The current timeline position is part of the shareable URL state (§13).

---

## 7. Camera choreography ("in-engine video")

- FR-7.1 A choreography system executes scripted camera flights: sequences of (position, bearing, pitch, zoom, duration, easing) keyframes bound to timeline positions or chapter entries.
- FR-7.2 Choreographies are interruptible at any time by user input (P4/FR-3.2.3).
- FR-7.3 Signature choreographies (minimum set): departure climb-out follow; the IGARI turn; the strait run to last radar; pull-back reveal of all 7 arcs; descent into the seabed terrain at the search area; debris "ring" tour of the western Indian Ocean finds.
- FR-7.4 Reduced-motion preference (§14) replaces flights with instant cuts + crossfade.

---

## 8. Media system

### 8.1 Audio — recorded evidence
- FR-8.1.1 **ATC radio recordings** (publicly released, ~7 min): presented as a segmented player — one segment per controller position (Delivery, Ground, Tower, Lumpur Radar) — each segment mapped to its UTC span.
- FR-8.1.2 Every audio item displays a rendered waveform with a moving playhead; users can click/drag the waveform to seek.
- FR-8.1.3 **Synchronized transcript captions** from the official transcript: the active utterance highlights during playback; clicking any transcript line seeks the audio to it; speaker (callsign/position) labeled per line.
- FR-8.1.4 **Map synchronization:** while ATC audio plays, the timeline advances in real time and the aircraft marker moves accordingly; key utterances (e.g., final transmission at 17:19:30) fire a visible pulse at the aircraft's position at that instant.
- FR-8.1.5 **Hydroacoustic clip** (published hydrophone signal analysis): playable from the HA01 station POI and from its Story chapter; presented with spectrogram-style visual, explicit labeling that the audio is time-compressed, an explanation of the candidate event, its uncertainty, and source citation.
- FR-8.1.6 Global audio rules: only one audio item plays at a time; audio never autoplays on page load; a persistent mini-player shows what is playing with pause/stop; leaving the relevant context (chapter/POI) keeps audio playing in the mini-player unless the user stops it.
- FR-8.1.7 All audio items appear in the Evidence Library with provenance (publisher, release date, original context).

### 8.2 Audio — illustrative (synthesized)
- FR-8.2.1 **Handshake sonification:** during flight-clock playback, each of the 7 handshakes triggers a distinct ping sound simultaneous with its arc highlight; the final log-on (00:19) has a distinct tone.
- FR-8.2.2 Illustrative audio is always labeled "synthesized — illustrative" wherever it is referenced, and is governed by a separate mute toggle from recorded evidence audio.
- FR-8.2.3 Optional subtle ambient sound per context (cabin/ocean), off by default, separately mutable.

### 8.3 Video
- FR-8.3.1 Video is used only where it is genuine evidence or official material: search-operation footage, AUV/seabed footage, published drift-model animations. No dramatizations.
- FR-8.3.2 Videos appear inside Detail Panels and Story chapters as poster-image placeholders; nothing loads until the user clicks play.
- FR-8.3.3 Self-hosted clips are short and captioned; third-party-hosted official footage is embedded via lightweight facade (poster + click-to-load) with source attribution.
- FR-8.3.4 A video never blocks map interaction; the map remains live behind/beside it. Closing the panel stops playback.
- FR-8.3.5 All video items appear in the Evidence Library with provenance.

### 8.4 Media performance behaviors
- FR-8.4.1 Media manifests (list + metadata + waveform data + captions) load with the app; media payloads (audio/video bytes) load on demand only.
- FR-8.4.2 The next chapter's media is prefetched while the current chapter is viewed (Story Mode only, on adequate connections).
- FR-8.4.3 Every media item functions independently of every other; a failed media load shows an inline error with a retry and never breaks the map or timeline.

---

## 9. Detail Panel

- FR-9.1 A single consistent side panel used by every clickable feature, containing: title, category, timestamp(s), narrative description, structured properties, media (if any), source citation(s) with outbound links, and contextual actions ("Fly here", "Set timeline to this moment", "Show related layer", "Open in Evidence Library").
- FR-9.2 The panel never obscures the feature it describes (camera nudges if needed).
- FR-9.3 Panel content is deep-linkable (§13).

---

## 10. Story Mode chapters (minimum set)

1. **Departure** — WMKK, 16:42 UTC; ATC audio segments (Delivery→Tower); climb-out choreography.
2. **"Good night, Malaysian three seven zero"** — 17:19:30; final transmission audio + synced caption + position pulse.
3. **Vanishing at IGARI** — 17:21; transponder loss; Epoch 1 ends; what secondary vs primary radar means.
4. **The turnback** — Epoch 2 radar track across the peninsula; dashed-confidence explanation.
5. **Last radar** — 18:22 past MEKAR; the moment recorded positions end.
6. **Seven handshakes** — arcs appear one by one with sonified pings on the flight clock; BTO explainer.
7. **00:19** — the final, incomplete log-on; what it likely implies; end of data.
8. **The acoustic clue** — HA01 hydrophone chapter with the recorded signal, spectrogram, and its uncertainty.
9. **Searching the surface** — 2014 multinational surface search polygons on the calendar timeline.
10. **Mapping the deep** — bathymetry reveal choreography; why the seabed had to be mapped first; named seafloor features.
11. **The underwater searches** — 2014–17, 2018, 2025–26 campaigns; surveyed vs unsurveyed within the current zone; agreement extended to June 2027.
12. **The ocean answers slowly** — drift animation on the calendar timeline; debris finds popping chronologically; flaperon chapter focus.
13. **Where things stand** — synthesis; every claim linked to its source; invitation to Explore Mode.

- FR-10.1 Each chapter: title, 1–3 short paragraphs, bound camera/timeline/layers/media as defined above, and citations.
- FR-10.2 A chapter index (progress rail) is always visible in Story Mode; any chapter is directly selectable.

---

## 11. Search & filtering

- FR-11.1 Global search: POIs, debris items, chapters, Evidence Library items — one box, grouped results, keyboard navigable.
- FR-11.2 Layer-level filters as defined per layer (§5.3.2, §5.5.2).
- FR-11.3 Active filters are visible as removable chips and encoded in the URL.

## 12. Provenance & integrity

- FR-12.1 Every layer, POI, media item, and chapter claim carries at least one citation to a primary source (report + section/page, dataset, or official release).
- FR-12.2 A permanent "Data & Methods" page: full source inventory, processing summary per layer (what was digitized/derived and how), known limitations, and the P2 confidence-styling legend.
- FR-12.3 Reconstructed/modelled/illustrative content is labeled at every point of display, without exception.

## 13. Deep linking & sharing

- FR-13.1 URL encodes: mode, chapter (if Story), camera state, timeline scale + position, active layers, active filters, open panel target, playing media item + position.
- FR-13.2 A "Share this view" action copies the URL; loading any such URL reproduces the state exactly.

## 14. Accessibility

- FR-14.1 All audio has synchronized captions/transcripts; all video has captions.
- FR-14.2 Full keyboard operation: timeline, chapters, layer toggles, POI search, panels.
- FR-14.3 Reduced-motion preference honored (§7.4); no purely color-encoded information (confidence styling uses pattern + color).
- FR-14.4 All panels and controls screen-reader labeled; the narrative content of Story Mode is readable as linear text without the map.

## 15. Performance requirements (functional)

- FR-15.1 First meaningful view (interactive globe + basemap + flight path) within 3 s on a typical broadband connection; no media bytes loaded at this point.
- FR-15.2 Sustained smooth interaction (target 60 fps; never below 30 fps) during camera flights with all default layers on, on a mid-range laptop and recent mid-range phone.
- FR-15.3 Data visible in a session is fetched incrementally by viewport and zoom; a casual full-story session transfers on the order of tens of MB, not hundreds.
- FR-15.4 The application is fully static-hostable: no server-side computation, no authenticated APIs, no API keys.
- FR-15.5 Offline behavior: previously viewed areas/chapters remain browsable within a session after connection loss; media gracefully unavailable.

## 16. Non-goals (v1)

- No user accounts, comments, or community submissions.
- No speculation content (theories without primary-source evidence) — the site presents evidence and clearly-labeled published reconstructions only.
- No live external data feeds at runtime; all data is compiled at build time.
- No multilingual UI in v1 (structure must not preclude it later).

---

## Appendix A — Source-to-feature inventory

Download links for every source below are in **Appendix B** (section numbers B.1–B.13).

| Feature | Primary source(s) |
|---|---|
| Epoch 1 path | Safety Investigation Report (2018) / Factual Information (2015) appendix figures (digitized); FR24 playback page as cross-reference. **No free raw ADS-B dataset exists** (FR24 export is subscription-gated). → B.1, B.2 |
| Epoch 2 radar track | Malaysian SIR (2018); ATSB *Definition of Underwater Search Areas* → B.2, B.3 |
| Arcs / handshakes | Released Inmarsat SATCOM log (May 2014) + validated CSV conversion (davetaz repo); Ashton et al. 2015 (open access) for methodology & BTO corrections → B.4 |
| Candidate reconstructions | ATSB reports; named independent-group publications |
| ATC audio + transcript | Official release (May 2014); SIR transcript |
| Hydroacoustic clip | Published university hydrophone analysis; open observatory data |
| Bathymetry | Geoscience Australia MH370 Phase 1 & 2 survey data; global open bathymetric grid |
| Search polygons | ATSB reports; operator/AAIB releases incl. 2025–26 progress reports; June 2026 extension announcement |
| Debris | Ministry of Transport debris examination reports |
| Drift trajectories | Published national-science-agency drift studies for ATSB |
| Search/seabed video | Official operator/agency releases (embedded with attribution) |

---

## Appendix B — Verified source download inventory (July 2026)

Every URL below was gathered and checked in July 2026. Status legend: **✅ verified live in-session** · ⚠️ fragile (mirror immediately) · 🔒 not openly downloadable. All sources are usable without API keys or accounts unless noted.

### B.1 Flight track data (recorded positions)

| Resource | URL | Format | Notes |
|---|---|---|---|
| Flightradar24 MH370 pinned playback | https://www.flightradar24.com/data/pinned/mh370-2d81a27/ | Web playback | Visual cross-reference only; CSV/KML export is subscription-gated |
| FR24 10-year retrospective (context) | https://www.flightradar24.com/blog/aviation-news/aviation-safety/mh370-10-year-anniversary/ | HTML | Confirms last ADS-B point ~17:21 UTC near IGARI |
| Recorded civil + military radar track | SIR (2018) & Factual Information (2015) appendices → B.2 | PDF figures | **Authoritative Epoch 1–2 source; requires digitization** |

> **Reality check:** the oft-cited "raw FR24 CSV released after the event" does not exist as a free standalone dataset. Plan digitization time for the appendix figures.

### B.2 Official Malaysian investigation reports

| Resource | URL | Format | Status |
|---|---|---|---|
| Safety Investigation Report (30 Jul 2018, 495 pp) | https://www.mot.gov.my/en/MH370%20Investigation%20Report/01-Report/MH370SafetyInvestigationReport.pdf | PDF | ⚠️ |
| SIR portal (report + all appendices) | http://mh370.mot.gov.my/ | HTML index | ⚠️ legacy portal, still resolves |
| SIR presentation slides (debris status summary) | https://www.mot.gov.my/en/Laporan%20MH%20370/MH%20370%20Safety%20Investigation%20Report%20Slides.pdf | PDF | ⚠️ |
| Factual Information report (Mar 2015) | https://www.mot.gov.my/en/Laporan%20MH%20370/Factual%20Information%20Safety%20Investigation%20For%20MH370.pdf | PDF | ⚠️ |
| MOT archived MH370 index | https://www.mot.gov.my/en/aviation/reports/archived-report/mh370 | HTML | ⚠️ |
| Preliminary report incl. ATC transcript (ICAO host) | https://www.icao.int/sites/default/files/safety/airnavigation/AIG/Documents/Safety-Recommendations-to-ICAO/Final-Reports/MOT_KIKU_9M-MRO_01-2014_preliminary_report.pdf | PDF | stable |
| Full 2018 report mirror (US court record) | https://images.law.com/contrib/content/uploads/documents/398/20710/Malaysia-Air-final-report.pdf | PDF | reliable fallback |

> Malaysian hosting has changed repeatedly (dca.gov.my †, mh370.gov.my †). Prefer `www.mot.gov.my/en/...` paths; self-host copies at build time.

### B.3 ATSB reports (all CC BY, Commonwealth of Australia)

Landing page: https://www.atsb.gov.au/mh370-pages/updates/reports · Overview: https://www.atsb.gov.au/mh370

| Report | URL |
|---|---|
| The Operational Search for MH370 (final, 3 Oct 2017, 440 pp — incl. Curtin acoustic reports as App. H & I) | https://www.atsb.gov.au/sites/default/files/media/5773565/operational-search-for-mh370_final_3oct2017.pdf |
| First Principles Review (Dec 2016) | https://www.atsb.gov.au/sites/default/files/media/5772107/ae2014054_final-first-principles-report.pdf |
| Search and debris examination update (Aug 2017) | https://www.atsb.gov.au/sites/default/files/media/5773389/ae-2014-054_mh370-search-and-debris-update_aug2017.pdf |
| Definition of Underwater Search Areas (Aug 2014 original; 3 Dec 2015 update) | via reports landing page above |
| Satellite imagery analysis (Geoscience Australia, 2017) | https://www.atsb.gov.au/sites/default/files/media/5773373/mh370_satellite-imagery-geoscienceaust-report.pdf |
| MH370 Data Review (GA/ATSB, Mar 2022) | https://www.atsb.gov.au/sites/default/files/2024-02/mh370-data-review-2022-final-report-v2.pdf |
| Investigation landing (AE-2014-054, debris examinations) | https://www.atsb.gov.au/publications/investigation_reports/2014/aair/ae-2014-054 |

### B.4 Inmarsat SATCOM data (arcs) — corrected section

| Resource | URL | Format | Status |
|---|---|---|---|
| Official log PDF — CNN CDN mirror (47 pp, redacted) | http://i2.cdn.turner.com/cnn/2014/images/05/27/flight.370.data.logs.pdf | PDF | ✅ verified live; original dca.gov.my dead |
| **Official log PDF + validated CSV conversion** — davetaz/mh370-data | https://github.com/davetaz/mh370-data | PDF + 2× CSV (BTO/BFO columns, 1,115 rows, 16:00→01:16 UTC) | ✅ **validated in-session: all 7 handshake BTO/BFO values match Ashton et al./ATSB exactly**, incl. 00:19:29 (BTO 23000) and the anomalous 00:19:37 (BTO 49660). Repo MIT; underlying data Malaysian Govt/Inmarsat release |
| Unredacted/complete logs (Iannello, Jun 2017) | https://mh370.radiantphysics.com/2017/06/12/the-unredacted-inmarsat-satellite-data-for-mh370/ | XLSX + PDF | ✅ verified live; includes prior flight (7 Mar 00:51 →) |
| Reformatted logs (community) | https://github.com/vincentclee/mh370_satellite_data_communication_logs | CSV | alternative conversion |
| Logs + explanatory notes | https://mh370.net/Communications:SATCOM_Logs/Notes | HTML | incl. Dec 2014 updated version |
| Ashton, Bruce, Colledge, Dickinson — "The Search for MH370", *J. Navigation* 68(1), 2015 — **Open Access (CC-BY)** | https://www.cambridge.org/core/journals/journal-of-navigation/article/search-for-mh370/D2D1C4C99E7BFDE35841CFD70081114A | HTML + PDF | BTO/BFO tables, satellite ephemeris, **log-on BTO correction method (§5)** — required before arc computation (log-on request BTOs carry a fixed ~4,600 μs offset; 00:19:37 value treated separately) |

### B.5 ATC audio + transcript

| Resource | URL | Format | Notes |
|---|---|---|---|
| ATC audio — Guardian news mirror | https://www.youtube.com/watch?v=CSEbGKiwDn0 | Streaming | ⚠️ No clean official file survives; embed via facade + archive a capture |
| ATC audio + full transcript — NBC News | https://www.nbcnews.com/storyline/missing-jet/listen-missing-jet-mh370-pilots-talking-air-traffic-control-n94716 | HTML + audio | ⚠️ |
| Official transcript (Scribd mirror of "BIT30March" doc) | https://www.scribd.com/doc/215668212/Audio-Transcript-MH370-Pilot-ATC-BIT | PDF/text | mirror |
| Authoritative transcript | ICAO preliminary report → B.2 | PDF | preferred citation source |

> Note: `archive.org/details/Mh370` is an unrelated book — do not cite it.

### B.6 Hydroacoustic data

| Resource | URL | Format | Status |
|---|---|---|---|
| Curtin CMST analysis writeup (Duncan, Jun 2014) | http://cmst.curtin.edu.au/wp-content/uploads/sites/4/2016/03/duncan_sound_clue_in_hunt_for_MH370_jun14.pdf | PDF | primary analysis |
| Curtin media release (4 Jun 2014) | https://www.curtin.edu.au/news/media-release/curtin-researchers-search-acoustic-evidence-mh370/ | HTML | HA01 + IMOS Perth Canyon context |
| Curtin acoustic reports (23 Jun & 4 Sep 2014) | Appendices H & I (pp. 369–413) of ATSB Operational Search final → B.3 | PDF | durable primary artefacts incl. spectrograms |
| IMOS/AODN acoustic data portal | https://portal.aodn.org.au/ | Portal | open (CC BY), underlying recorder data |
| CTBTO IMS HA01 raw data | https://www.ctbto.org/ (vDEC) | — | 🔒 formal data-access agreement required |
| Independent acoustic analysis | https://370location.org/ | HTML | sample clips referenced |

### B.7 Bathymetry / seabed

| Resource | URL | Format / size | License |
|---|---|---|---|
| GA MH370 Data Release (master entry) | https://www.ga.gov.au/about/projects/marine/mh370-data-release | HTML | CC BY 4.0 |
| GA data portal (processed; clip/zip/ship) | https://portal.ga.gov.au/persona/marine | GeoTIFF, xyz, shapefile, CSV | CC BY 4.0 |
| Phase 1 dataset DOI record | https://researchdata.edu.au/mh370-search-phase-processed-datasets/3436710 | DOI 10.4225/25/595d7744b71e2 · 278,000 km² in-area (710,000 km² incl. transits) | CC BY 4.0 |
| Phase 2 catalogue (SAS/MBES/SSS high-res) | https://ecat.ga.gov.au/geonetwork/srv/api/records/11759ecd-b6ea-4e98-95fd-b966cd5735b3 | Metadata → downloads | CC BY 4.0 |
| AusSeabed Marine Data Portal | https://www.ausseabed.gov.au/data | Portal (e.g., 76 m tiles) | CC BY 4.0 |
| Raw grids (very large) | via GA landing → NCI | Grids | CC BY 4.0; specialist tooling |
| GEBCO 2026 grid (latest, publ. 23 Apr 2026) | https://www.gebco.net/data-products/gridded-bathymetry-data | netCDF/GeoTIFF/ASCII, ~7.5 GB global | Public domain |
| GEBCO 2025 grid page | https://www.gebco.net/data-products-gridded-bathymetry-data/gebco2025-grid | 15 arc-sec, DOI 10.5285/37c52e96-24ea-67ce-e063-7086abc05f29 | Public domain |
| GEBCO area-subset download app | https://download.gebco.net/ | user-defined extracts | Public domain |
| GEBCO 2025 direct netCDF (CEDA) | https://dap.ceda.ac.uk/bodc/gebco/global/gebco_2025/ice_surface_elevation/netcdf/gebco_2025.zip?download=1 | ~3.7 GB zip | Public domain |
| GA search-area story map (visual reference) | https://geoscience-au.maps.arcgis.com/apps/Cascade/index.html?appid=038a72439bfa4d28b3dde81cc6ff3214 | Web | CC BY 4.0 |
| NOAA NCEI mirror | NCEI multibeam archive (search "MH370" / Fugro) | Grids | Public domain |
| Ocean Infinity 2018 / 2025–26 sonar data | — | — | 🔒 proprietary, never released |

### B.8 Debris

| Resource | URL | Notes |
|---|---|---|
| MOT Debris Examination Reports (28 Feb 2017) | https://www.mot.gov.my/en/Laporan%20MH%20370/Debris%20Examination%20Reports%20-%2028Feb2017.pdf | ⚠️ Items, find locations, status |
| SIR slides — 27-item status summary | → B.2 slides link | 3 confirmed / 7 almost certain / 8 highly likely / … |
| ATSB flaperon + flap analyses | https://www.atsb.gov.au/publications/investigation_reports/2014/aair/ae-2014-054 and B.3 Aug 2017 update | CC BY |
| Compiled coordinates table (~33 items) | https://en.wikipedia.org/wiki/Search_for_Malaysia_Airlines_Flight_370 | CC BY-SA; good GeoJSON base — verify each against MOT reports |
| Godfrey debris compilation (33 items / 22 locations) | https://www.mh370search.com/2021/01/21/mh370-debris-drift-analysis/ | independent cross-check |

### B.9 Drift modelling (CSIRO, for ATSB)

| Resource | URL |
|---|---|
| Part I (8 Dec 2016) | https://doi.org/10.4225/08/5892224dec08c |
| Part II (13 Apr 2017) | https://doi.org/10.4225/08/58fba83e73f2b |
| Part III (26 Jun 2017) | https://www.atsb.gov.au/sites/default/files/media/5773371/mh370_csiro-ocean-drift-iiil.pdf |
| Part IV (3 Oct 2017) | via ATSB reports landing page → B.3 |
| Griffin project page — **KMZ trajectories + animations** | http://www.marine.csiro.au/~griffin/MH370/ |
| CSIRO blog (Google Earth animation downloads) | https://blog.csiro.au/what-does-our-ocean-modelling-tell-us-about-the-fate-of-flight-mh370/ |
| ATSB search videos (drift sim + underwater) | https://www.atsb.gov.au/mh370-search-videos |

### B.10 Search-area geometries

No official KMZ/KML/shapefile exists for any campaign — polygons must be digitized from report figures and cross-checked against independent researchers.

| Resource | URL | Use |
|---|---|---|
| ATSB report figures (2014–2017 zones) | → B.3, esp. Operational Search final | primary digitization source |
| GA story map (area extents) | → B.7 story map | visual cross-check |
| MOT media release — search resumption (Dec 2025) | https://www.mot.gov.my/en/Kenyataan%20Media/Year%202025/MEDIA%20RELEASE%20RESUMPTION%20OF%20MH370%20SEARCH%20BY%20OCEAN%20INFINITY%20IN%20THE%20SOUTHERN%20INDIAN%20OCEAN.pdf | 2025–26 zone definition |
| MOT update to families (2026) — phases & coverage | https://www.mot.gov.my/en/Kenyataan%20Media/Year%202026/MH370%20Search%20Operation%202025-2026%20-%20Update%20to%20Families.pdf | 25–28 Mar 2025 + 31 Dec 2025–23 Jan 2026; ~7,571 of 15,000 km² covered |
| Ocean Infinity conclusion statement (8 Mar 2026) | https://oceaninfinity.com/news/conclusion-of-the-search-for-malaysian-airlines-flight-mh370/ | 151 days at sea, >140,000 km² mapped since 2018 |
| Iannello search-area figures/KMZ | https://mh370.radiantphysics.com/ | independent geometry |
| Godfrey recommended-area geometry | https://www.mh370search.com/ | independent geometry |

### B.11 Independent reconstructions (Epoch 3 candidate paths)

| Resource | URL | Notes |
|---|---|---|
| UGIB 2020 "The Final Resting Place of MH370" + appendices | https://mh370.radiantphysics.com/papers/ | LEP 34.2342°S 93.7875°E; path data in posts (KMZ/CSV) |
| Iannello papers/data hub | https://mh370.radiantphysics.com/papers/ | multiple reconstructions |
| Godfrey reconstructions | https://www.mh370search.com/ | flight path + drift |

### B.12 Official video / footage (embed with attribution)

| Resource | URL | License |
|---|---|---|
| GA search-area fly-over | https://www.youtube.com/embed/PAJdHx6QT5I (via GA data release page) | CC BY 4.0 |
| ATSB search videos (Fugro underwater + CSIRO drift) | https://www.atsb.gov.au/mh370-search-videos | CC BY |
| Ocean Infinity press/footage | https://oceaninfinity.com/news/ | © OI — embed only |
| CSIRO animations | http://www.marine.csiro.au/~griffin/MH370/ | CSIRO |

### B.13 Basemap / infrastructure (no-key, verified 2026)

| Resource | URL | Notes |
|---|---|---|
| OpenFreeMap styles (liberty / positron / bright / 3d) | https://tiles.openfreemap.org/styles/liberty | ✅ No key, no registration, no limits; attribution required (ODbL data) |
| OpenFreeMap project + planet downloads | https://openfreemap.org/ | weekly full-planet downloads for self-hosting |
| Protomaps planet PMTiles daily builds | https://maps.protomaps.com/builds | ~120 GB planet; copy to own storage (BSD-3/CC0/ODbL) |
| Protomaps download docs | https://docs.protomaps.com/basemaps/downloads | BLAKE3 hashes |
| Natural Earth | https://www.naturalearthdata.com/downloads/ | Public domain vectors/rasters |
| Natural Earth GitHub | https://github.com/nvkelso/natural-earth-vector | version-controlled |

### B.14 Build-time mirroring checklist (do before first deploy)

1. Download + self-host: all MOT PDFs (B.2, B.8, B.10), the Inmarsat PDF (B.4 — two mirrors already exist: CNN CDN + davetaz repo), CSIRO KMZs (B.9), independent KMZ/CSV path data (B.11).
2. Archive an ATC-audio capture (B.5) and a Wayback snapshot of `mh370.mot.gov.my`.
3. Record the retrieval date + SHA-256 of every mirrored file in the Data & Methods page (FR-12.2).
4. Known-dead sources — do not cite: `dca.gov.my` originals, `archive.org/details/Mh370`.