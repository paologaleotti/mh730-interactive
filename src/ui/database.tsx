// Database mode: full-screen chronological index of every evidence item.
// No map; a vertical timeline grouped by year, each item linking to its
// primary source.

import { useState } from 'react'
import {
  EVIDENCE_SORTED,
  CATEGORY_META,
  type EvidenceCategory,
} from '../config/evidence'

const CATEGORIES: EvidenceCategory[] = ['report', 'dataset', 'audio', 'analysis', 'event']

export const Database = () => {
  const [filter, setFilter] = useState<EvidenceCategory | null>(null)

  const items = filter
    ? EVIDENCE_SORTED.filter((e) => e.category === filter)
    : EVIDENCE_SORTED

  return (
    <div className="database" role="main" aria-label="Evidence database">
      <div className="db-inner">
        <header className="db-head">
          <h1 className="db-title">EVIDENCE DATABASE</h1>
          <p className="db-sub">
            Every artifact in this application, chronologically. Each entry
            links to its primary source.
          </p>
          <div className="db-filters" role="group" aria-label="Filter by category">
            <button
              type="button"
              className="chip"
              aria-pressed={filter === null}
              onClick={() => setFilter(null)}
            >
              ALL ({EVIDENCE_SORTED.length})
            </button>
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                className={`chip chip-${c}`}
                aria-pressed={filter === c}
                onClick={() => setFilter(filter === c ? null : c)}
              >
                {CATEGORY_META[c].label}
              </button>
            ))}
          </div>
        </header>

        <ol className="db-list">
          {items.map((e, i) => {
            const year = e.date.slice(0, 4)
            const showYear = i === 0 || items[i - 1].date.slice(0, 4) !== year
            return (
              <li key={e.id} className="db-item">
                {showYear && <div className="db-year">{year}</div>}
                <div className="db-row">
                  <div className="db-date">{e.date}</div>
                  <div className="db-node" aria-hidden="true" />
                  <div className="db-card">
                    <div className="db-card-head">
                      <span className={`chip chip-sm chip-${e.category}`}>
                        {CATEGORY_META[e.category].label}
                      </span>
                      <span className="db-publisher">{e.publisher}</span>
                    </div>
                    <h3 className="db-item-title">
                      <a href={e.url} target="_blank" rel="noopener">
                        {e.title} <span className="db-ext">↗</span>
                      </a>
                    </h3>
                    <p className="db-desc">{e.desc}</p>
                  </div>
                </div>
              </li>
            )
          })}
        </ol>

        <footer className="db-foot">
          Source inventory per spec Appendix B · retrieval dates and checksums
          will be published on the Data &amp; Methods page.
        </footer>
      </div>
    </div>
  )
}
