// Evidence database (spec §3.3 Evidence Library). Every item is a real,
// dated artifact with an outbound link to its source (Appendix B of the spec).
// This seeds the Database mode; media payloads and "show on globe"
// cross-links come later.

export type EvidenceCategory =
  | 'report'
  | 'dataset'
  | 'audio'
  | 'analysis'
  | 'event'

export interface EvidenceItem {
  id: string
  /** ISO date (UTC) the artifact was published / the event occurred. */
  date: string
  title: string
  publisher: string
  category: EvidenceCategory
  desc: string
  url: string
  /** Layer ids this item supports (future "show on globe" action). */
  layers?: string[]
}

export const CATEGORY_META: Record<EvidenceCategory, { label: string }> = {
  report: { label: 'REPORT' },
  dataset: { label: 'DATASET' },
  audio: { label: 'AUDIO' },
  analysis: { label: 'ANALYSIS' },
  event: { label: 'EVENT' },
}

export const EVIDENCE: EvidenceItem[] = [
  {
    id: 'disappearance',
    date: '2014-03-08',
    title: 'MH370 disappears',
    publisher: 'Event',
    category: 'event',
    desc: 'Last ADS-B position near IGARI at 17:21 UTC (7 March); final SATCOM log-on 00:19 UTC (8 March). 239 people aboard.',
    url: 'https://www.mot.gov.my/en/aviation/reports/archived-report/mh370',
    layers: ['flight-epoch1', 'flight-epoch2', 'arcs'],
  },
  {
    id: 'preliminary-report',
    date: '2014-04-09',
    title: 'Preliminary report (incl. ATC transcript)',
    publisher: 'Malaysia MOT / ICAO',
    category: 'report',
    desc: 'First official report; contains the authoritative ATC communications transcript.',
    url: 'https://www.icao.int/sites/default/files/safety/airnavigation/AIG/Documents/Safety-Recommendations-to-ICAO/Final-Reports/MOT_KIKU_9M-MRO_01-2014_preliminary_report.pdf',
  },
  {
    id: 'atc-audio',
    date: '2014-05-01',
    title: 'ATC radio recordings released (~7 min)',
    publisher: 'Malaysia DCA',
    category: 'audio',
    desc: 'Delivery, Ground, Tower and Lumpur Radar segments, ending with "Good night, Malaysian three seven zero" at 17:19:30 UTC.',
    url: 'https://www.nbcnews.com/storyline/missing-jet/listen-missing-jet-mh370-pilots-talking-air-traffic-control-n94716',
    layers: ['flight-epoch1'],
  },
  {
    id: 'inmarsat-log',
    date: '2014-05-27',
    title: 'Inmarsat SATCOM log released (47 pp)',
    publisher: 'Malaysia DCA / Inmarsat',
    category: 'dataset',
    desc: 'The BTO/BFO communications log defining the seven handshake arcs. Validated CSV conversion available (davetaz/mh370-data).',
    url: 'https://github.com/davetaz/mh370-data',
    layers: ['arcs'],
  },
  {
    id: 'curtin-acoustic',
    date: '2014-06-04',
    title: 'Hydroacoustic analysis (HA01 Cape Leeuwin)',
    publisher: 'Curtin University CMST',
    category: 'analysis',
    desc: 'Candidate low-frequency event recorded on IMOS/CTBTO hydrophones, timing broadly consistent with the 7th arc; high uncertainty.',
    url: 'http://cmst.curtin.edu.au/wp-content/uploads/sites/4/2016/03/duncan_sound_clue_in_hunt_for_MH370_jun14.pdf',
    layers: ['poi'],
  },
  {
    id: 'atsb-definition',
    date: '2014-08-18',
    title: 'Definition of Underwater Search Areas',
    publisher: 'ATSB',
    category: 'report',
    desc: 'BTO/BFO-based definition of the southern Indian Ocean priority area (updated 3 Dec 2015).',
    url: 'https://www.atsb.gov.au/mh370-pages/updates/reports',
    layers: ['search', 'arcs'],
  },
  {
    id: 'ashton-2015',
    date: '2015-01-01',
    title: '"The Search for MH370" (Ashton et al.)',
    publisher: 'Journal of Navigation 68(1), open access',
    category: 'analysis',
    desc: 'The satellite-communications methodology: BTO/BFO measurements, satellite ephemeris, and the log-on BTO correction behind the arcs.',
    url: 'https://www.cambridge.org/core/journals/journal-of-navigation/article/search-for-mh370/D2D1C4C99E7BFDE35841CFD70081114A',
    layers: ['arcs'],
  },
  {
    id: 'factual-information',
    date: '2015-03-08',
    title: 'Factual Information report',
    publisher: 'Malaysian ICAO Annex 13 Team',
    category: 'report',
    desc: 'Detailed factual record at one year: radar data, aircraft systems, crew, cargo. Primary source for the Epoch 1-2 track figures.',
    url: 'https://www.mot.gov.my/en/Laporan%20MH%20370/Factual%20Information%20Safety%20Investigation%20For%20MH370.pdf',
    layers: ['flight-epoch1', 'flight-epoch2'],
  },
  {
    id: 'flaperon',
    date: '2015-07-29',
    title: 'Flaperon found on Réunion',
    publisher: 'Event · confirmed 9M-MRO',
    category: 'event',
    desc: 'First recovered debris, confirmed by French judicial examination as MH370\'s right flaperon.',
    url: 'https://www.atsb.gov.au/publications/investigation_reports/2014/aair/ae-2014-054',
    layers: ['debris', 'drift'],
  },
  {
    id: 'first-principles',
    date: '2016-12-20',
    title: 'First Principles Review',
    publisher: 'ATSB',
    category: 'report',
    desc: 'Expert re-examination of all evidence; recommended a new 25,000 km² area to the north of the searched zone.',
    url: 'https://www.atsb.gov.au/sites/default/files/media/5772107/ae2014054_final-first-principles-report.pdf',
    layers: ['search'],
  },
  {
    id: 'csiro-drift-1',
    date: '2016-12-08',
    title: 'CSIRO drift modelling, Part I (of IV)',
    publisher: 'CSIRO for ATSB',
    category: 'analysis',
    desc: 'Ocean-drift simulations from candidate 7th-arc origins tested against debris find locations and timing. Parts II-IV followed in 2017.',
    url: 'http://www.marine.csiro.au/~griffin/MH370/',
    layers: ['drift', 'debris'],
  },
  {
    id: 'debris-reports',
    date: '2017-02-28',
    title: 'Debris examination reports',
    publisher: 'Malaysia MOT',
    category: 'report',
    desc: 'Item-by-item examination of recovered debris: find locations, part identification, confirmation status.',
    url: 'https://www.mot.gov.my/en/Laporan%20MH%20370/Debris%20Examination%20Reports%20-%2028Feb2017.pdf',
    layers: ['debris'],
  },
  {
    id: 'operational-search',
    date: '2017-10-03',
    title: 'The Operational Search for MH370 (final, 440 pp)',
    publisher: 'ATSB',
    category: 'report',
    desc: 'Complete record of the 2014-17 surface and underwater searches, incl. Curtin acoustic reports (App. H & I) and bathymetry program.',
    url: 'https://www.atsb.gov.au/sites/default/files/media/5773565/operational-search-for-mh370_final_3oct2017.pdf',
    layers: ['search', 'bathymetry'],
  },
  {
    id: 'ga-bathymetry',
    date: '2017-07-19',
    title: 'MH370 Phase 1 bathymetry data release',
    publisher: 'Geoscience Australia',
    category: 'dataset',
    desc: '278,000 km² of high-resolution seabed mapping from the search, openly released (CC BY 4.0).',
    url: 'https://www.ga.gov.au/about/projects/marine/mh370-data-release',
    layers: ['bathymetry'],
  },
  {
    id: 'oi-2018',
    date: '2018-01-22',
    title: 'Ocean Infinity search (Seabed Constructor)',
    publisher: 'Ocean Infinity / Malaysia',
    category: 'event',
    desc: 'No-find-no-fee AUV search of ~112,000 km² along the 7th arc; ended 29 May 2018 without locating the aircraft.',
    url: 'https://oceaninfinity.com/news/',
    layers: ['search'],
  },
  {
    id: 'sir-2018',
    date: '2018-07-30',
    title: 'Safety Investigation Report (495 pp)',
    publisher: 'Malaysian ICAO Annex 13 Team',
    category: 'report',
    desc: 'The final Malaysian investigation report: full factual record, analysis, and the authoritative radar track appendices.',
    url: 'https://www.mot.gov.my/en/MH370%20Investigation%20Report/01-Report/MH370SafetyInvestigationReport.pdf',
    layers: ['flight-epoch1', 'flight-epoch2', 'arcs', 'debris'],
  },
  {
    id: 'data-review-2022',
    date: '2022-03-31',
    title: 'MH370 Data Review',
    publisher: 'Geoscience Australia / ATSB',
    category: 'report',
    desc: 'Review of sonar contacts and data quality from the completed search areas.',
    url: 'https://www.atsb.gov.au/sites/default/files/2024-02/mh370-data-review-2022-final-report-v2.pdf',
    layers: ['search', 'bathymetry'],
  },
  {
    id: 'oi-resumption',
    date: '2025-12-30',
    title: 'Search resumption announced (2025-26)',
    publisher: 'Malaysia MOT / Ocean Infinity',
    category: 'event',
    desc: 'New 15,000 km² zone along the 7th arc under a no-find-no-fee agreement; ~7,571 km² surveyed across two campaigns.',
    url: 'https://www.mot.gov.my/en/Kenyataan%20Media/Year%202025/MEDIA%20RELEASE%20RESUMPTION%20OF%20MH370%20SEARCH%20BY%20OCEAN%20INFINITY%20IN%20THE%20SOUTHERN%20INDIAN%20OCEAN.pdf',
    layers: ['search'],
  },
  {
    id: 'oi-conclusion',
    date: '2026-03-08',
    title: 'Ocean Infinity concludes 2025-26 campaign',
    publisher: 'Ocean Infinity',
    category: 'event',
    desc: '151 days at sea; >140,000 km² mapped since 2018. Remaining ~7,428 km² pending under the agreement extended to 30 June 2027.',
    url: 'https://oceaninfinity.com/news/conclusion-of-the-search-for-malaysian-airlines-flight-mh370/',
    layers: ['search'],
  },
]

/** Sorted ascending by date. */
export const EVIDENCE_SORTED = [...EVIDENCE].sort((a, b) =>
  a.date.localeCompare(b.date),
)
