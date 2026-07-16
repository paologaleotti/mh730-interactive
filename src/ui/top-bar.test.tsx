// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TopBar } from './top-bar'
import { useView } from '../state/view'
import { useClock } from '../state/clock'

const initialView = useView.getState()
const initialClock = useClock.getState()

beforeEach(() => {
  useView.setState(initialView, true)
  useClock.setState(initialClock, true)
})

afterEach(cleanup)

describe('TopBar', () => {
  it('renders the three mode buttons with the current mode pressed', () => {
    render(<TopBar />)
    expect(screen.getByRole('button', { name: 'EXPLORE' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: 'FLIGHT' }).getAttribute('aria-pressed')).toBe('false')
    expect(screen.getByRole('button', { name: 'DATABASE' }).getAttribute('aria-pressed')).toBe('false')
  })

  it('mode buttons switch the store mode', async () => {
    const user = userEvent.setup()
    render(<TopBar />)
    await user.click(screen.getByRole('button', { name: 'FLIGHT' }))
    expect(useView.getState().mode).toBe('flight')
    expect(useClock.getState().scale).toBe('flight')

    await user.click(screen.getByRole('button', { name: 'DATABASE' }))
    expect(useView.getState().mode).toBe('database')
  })

  it('shows GLOBE/FLAT and LAYERS controls on map modes', () => {
    render(<TopBar />)
    expect(screen.getByRole('button', { name: 'GLOBE' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'FLAT' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Toggle layers panel' })).toBeDefined()
  })

  it('hides GLOBE/FLAT and LAYERS in database mode', async () => {
    const user = userEvent.setup()
    render(<TopBar />)
    await user.click(screen.getByRole('button', { name: 'DATABASE' }))
    expect(screen.queryByRole('button', { name: 'GLOBE' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'FLAT' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Toggle layers panel' })).toBeNull()
  })

  it('FLAT switches projection to mercator and GLOBE back', async () => {
    const user = userEvent.setup()
    render(<TopBar />)
    await user.click(screen.getByRole('button', { name: 'FLAT' }))
    expect(useView.getState().projection).toBe('mercator')
    await user.click(screen.getByRole('button', { name: 'GLOBE' }))
    expect(useView.getState().projection).toBe('globe')
  })

  it('LAYERS button toggles panelOpen', async () => {
    const user = userEvent.setup()
    render(<TopBar />)
    expect(useView.getState().panelOpen).toBe(true)
    await user.click(screen.getByRole('button', { name: 'Toggle layers panel' }))
    expect(useView.getState().panelOpen).toBe(false)
  })
})
