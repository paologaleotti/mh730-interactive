// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Database } from './database'
import { EVIDENCE_SORTED, CATEGORY_META } from '../config/evidence'

afterEach(cleanup)

const listItems = () => within(screen.getByRole('list')).getAllByRole('listitem')

describe('Database', () => {
  it('renders every evidence item with its title', () => {
    render(<Database />)
    expect(listItems().length).toBe(EVIDENCE_SORTED.length)
    // Titles share prefixes (two "Ocean Infinity ..." items), so match by href
    // and assert the anchor text contains the title.
    const links = within(screen.getByRole('list')).getAllByRole('link')
    for (const e of EVIDENCE_SORTED) {
      const link = links.find(
        (a) => a.getAttribute('href') === e.url && (a.textContent ?? '').includes(e.title),
      )
      expect(link).toBeDefined()
    }
  })

  it('renders items in chronological order', () => {
    render(<Database />)
    const dates = listItems().map((li) => li.textContent ?? '')
    const itemDates = EVIDENCE_SORTED.map((e) => e.date)
    const ok = dates.every((text, i) => text.includes(itemDates[i]))
    expect(ok).toBe(true)
  })

  it('the ALL chip shows the total count and starts pressed', () => {
    render(<Database />)
    const all = screen.getByRole('button', { name: `ALL (${EVIDENCE_SORTED.length})` })
    expect(all.getAttribute('aria-pressed')).toBe('true')
  })

  it('a category filter narrows the list to that category', async () => {
    const user = userEvent.setup()
    render(<Database />)
    await user.click(screen.getByRole('button', { name: CATEGORY_META.report.label }))
    const expected = EVIDENCE_SORTED.filter((e) => e.category === 'report').length
    expect(expected).toBeGreaterThan(0)
    expect(expected).toBeLessThan(EVIDENCE_SORTED.length)
    expect(listItems().length).toBe(expected)
  })

  it('clicking the active category chip again clears the filter', async () => {
    const user = userEvent.setup()
    render(<Database />)
    const audioChip = screen.getByRole('button', { name: CATEGORY_META.audio.label })
    await user.click(audioChip)
    expect(listItems().length).toBe(
      EVIDENCE_SORTED.filter((e) => e.category === 'audio').length,
    )
    await user.click(audioChip)
    expect(listItems().length).toBe(EVIDENCE_SORTED.length)
  })

  it('the ALL chip restores the full list after filtering', async () => {
    const user = userEvent.setup()
    render(<Database />)
    await user.click(screen.getByRole('button', { name: CATEGORY_META.dataset.label }))
    await user.click(screen.getByRole('button', { name: `ALL (${EVIDENCE_SORTED.length})` }))
    expect(listItems().length).toBe(EVIDENCE_SORTED.length)
  })

  it('every item link opens in a new tab with its source URL', () => {
    render(<Database />)
    const links = within(screen.getByRole('list')).getAllByRole('link')
    expect(links.length).toBe(EVIDENCE_SORTED.length)
    expect(links.every((a) => a.getAttribute('target') === '_blank')).toBe(true)
    const hrefs = new Set(links.map((a) => a.getAttribute('href')))
    for (const e of EVIDENCE_SORTED) {
      expect(hrefs.has(e.url)).toBe(true)
    }
  })
})
