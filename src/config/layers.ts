// Layer registry (P1/P2). Every data layer the globe will render is declared
// here with its epistemic confidence and a primary-source citation. The map
// engine and the layer panel both read from this single source of truth.

export type Confidence = 'recorded' | 'derived' | 'modelled'

export interface Citation {
  label: string
  url: string
}

export interface LayerDef {
  id: string
  label: string
  group: string
  desc: string
  confidence?: Confidence
  citation?: Citation
  /** Visible on first load (before any URL override). */
  defaultVisible: boolean
  /** Declared in the spec but not yet rendered; toggle disabled in the UI. */
  planned?: boolean
}

// Groups are display-ordered by first appearance below.
export const LAYERS: LayerDef[] = [
  {
    id: 'flight-epoch1',
    label: 'Epoch 1 · ADS-B track',
    group: 'Flight path',
    desc: 'Recorded civil positions, WMKK departure → IGARI (00:42–01:21 UTC+8, 8 Mar).',
    confidence: 'recorded',
    citation: {
      label: 'SIR 2018 / Factual Information 2015',
      url: 'https://www.mot.gov.my/en/MH370%20Investigation%20Report/01-Report/MH370SafetyInvestigationReport.pdf',
    },
    defaultVisible: true,
  },
  {
    id: 'flight-epoch2',
    label: 'Epoch 2 · military radar',
    group: 'Flight path',
    // Spec §2: recorded, lower precision. Dashed styling conveys the lower
    // precision; the epistemic status stays "recorded".
    desc: 'Primary radar track: military-derived turnback at IGARI + recorded Kota Bharu/Butterworth civil PSR returns → Strait of Malacca → last fix past MEKAR (01:21–02:22 UTC+8, 8 Mar).',
    confidence: 'recorded',
    citation: {
      label: 'Malaysian SIR 2018; ATSB search-area definition',
      url: 'https://www.atsb.gov.au/mh370',
    },
    defaultVisible: true,
  },
  {
    id: 'flight-epoch3',
    label: 'Epoch 3 · candidate reconstructions',
    group: 'Flight path',
    desc: 'SATCOM-only period (02:25–08:19 UTC+8, 8 Mar). No recorded positions; 4 named, cited reconstructions (Ashton 2015, UGIB 2020, CAPTIO 2022, WSPR 2023 — contested).',
    confidence: 'modelled',
    citation: {
      label: 'ATSB reports; UGIB 2020; independent groups',
      url: 'https://mh370.radiantphysics.com/papers/',
    },
    defaultVisible: true,
  },
  {
    id: 'arcs',
    label: 'Inmarsat arcs (HS1–HS7)',
    group: 'Satellite',
    desc: 'Seven BTO-derived handshake rings. The bold stretch on each marks where the credible southern-route reconstructions place the aircraft; it tightens to a sub-degree band on the 7th arc, which constrains every search area.',
    confidence: 'derived',
    citation: {
      label: 'Ashton et al. 2015 (J. Navigation, open access)',
      url: 'https://www.cambridge.org/core/journals/journal-of-navigation/article/search-for-mh370/D2D1C4C99E7BFDE35841CFD70081114A',
    },
    defaultVisible: true,
  },
  {
    id: 'aux-arcs',
    label: 'CAPTIO extra signals',
    group: 'Satellite',
    desc: 'An 8th distance ring the CAPTIO study uses that the official reports leave out: an automatic status message at 02:28 (UTC+8) whose timing measures the aircraft\'s distance from the satellite, ~3 min after the 02:25 (UTC+8) log-on. The two unanswered sat-phone calls carry only direction, not distance, so they define no ring and are shown on the timeline, not the map.',
    confidence: 'modelled',
    citation: {
      label: 'Blelly & Marchand (CAPTIO), Table 10; released Inmarsat log',
      url: 'https://www.mh370-caption.net/index.php/caption-technical-documentation/',
    },
    defaultVisible: false,
  },
  {
    id: 'satellite',
    label: 'Satellite sub-point (3F1)',
    group: 'Satellite',
    desc: 'Inmarsat-3F1 sub-satellite point with sightline to the active arc during playback.',
    confidence: 'derived',
    defaultVisible: false,
    planned: true,
  },
  {
    id: 'search',
    label: 'Search areas',
    group: 'Search history',
    // Spec B.10: no official geometry exists; all polygons are digitized from
    // report figures, so P2 classifies them as derived.
    desc: '2014 surface phases, ATSB underwater zone, Ocean Infinity 2018 & 2025–26 (surveyed vs pending to Jun 2027). Digitized from report figures.',
    confidence: 'derived',
    citation: {
      label: 'ATSB & MOT reports; Ocean Infinity releases',
      url: 'https://www.atsb.gov.au/mh370-pages/updates/reports',
    },
    defaultVisible: true,
  },
  {
    id: 'bathymetry',
    label: 'Bathymetry (seabed)',
    group: 'Seabed',
    desc: 'Hillshaded, hypsometric seabed. Phase 1 survey footprint at native resolution; global grid fills gaps.',
    confidence: 'recorded',
    citation: {
      label: 'Geoscience Australia MH370 release; GEBCO 2025',
      url: 'https://www.ga.gov.au/about/projects/marine/mh370-data-release',
    },
    defaultVisible: false,
  },
  {
    id: 'debris',
    label: 'Recovered debris',
    group: 'Debris & drift',
    desc: '~30+ recovered items at documented find locations, styled by confirmation status.',
    confidence: 'recorded',
    citation: {
      label: 'MOT debris examination reports',
      url: 'https://www.mot.gov.my/en/Laporan%20MH%20370/Debris%20Examination%20Reports%20-%2028Feb2017.pdf',
    },
    defaultVisible: true,
  },
  {
    id: 'candidate-sites',
    label: 'Candidate crash sites',
    group: 'Debris & drift',
    desc: 'Published candidate impact locations from named analyses (UGIB, CSIRO drift, ATSB review, WSPR). All modelled.',
    confidence: 'modelled',
    citation: {
      label: 'UGIB 2020; CSIRO; ATSB; mh370search.com',
      url: 'https://mh370.radiantphysics.com/papers/',
    },
    defaultVisible: true,
  },
  {
    id: 'drift',
    label: 'Drift modelling',
    group: 'Debris & drift',
    desc: 'Modelled oceanographic drift trajectories from candidate 7th-arc origins.',
    confidence: 'modelled',
    citation: {
      label: 'CSIRO drift studies for ATSB',
      url: 'http://www.marine.csiro.au/~griffin/MH370/',
    },
    defaultVisible: false,
    planned: true,
  },
  {
    id: 'poi',
    label: 'Points of interest & labels',
    group: 'Reference',
    desc: 'Airports, waypoints, event markers, handshake labels, seafloor features, hydroacoustic stations.',
    defaultVisible: true,
  },
]

export const LAYER_GROUPS: string[] = [...new Set(LAYERS.map((l) => l.group))]

export const DEFAULT_LAYER_VIS: Record<string, boolean> = Object.fromEntries(
  LAYERS.map((l) => [l.id, l.defaultVisible]),
)

export const CONFIDENCE_META: Record<Confidence, { label: string; hint: string }> = {
  recorded: { label: 'RECORDED', hint: 'Measured / instrument data' },
  derived: { label: 'DERIVED', hint: 'Computed from recorded data' },
  modelled: { label: 'MODELLED', hint: 'Simulated or reconstructed, illustrative' },
}
