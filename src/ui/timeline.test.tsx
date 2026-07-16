// @vitest-environment jsdom
import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Timeline } from './timeline'
import { useClock, FLIGHT_START } from '../state/clock'
import { eventsForScale } from '../config/events'

const initialClock = useClock.getState()

beforeAll(() => {
  // jsdom does not implement pointer capture; the track's onPointerDown
  // calls setPointerCapture on every press, so stub it for this file.
  Element.prototype.setPointerCapture = () => {}
  Element.prototype.releasePointerCapture = () => {}
  Element.prototype.hasPointerCapture = () => false
})

beforeEach(() => {
  useClock.setState(initialClock, true)
})

afterEach(cleanup)

describe('Timeline', () => {
  it('renders the flight clock label', () => {
    render(<Timeline />)
    expect(screen.getByText('FLIGHT CLOCK · 7-8 MAR 2014')).toBeDefined()
  })

  it('renders one tick per flight event', () => {
    render(<Timeline />)
    const events = eventsForScale('flight')
    expect(events.length).toBeGreaterThan(0)
    for (const ev of events) {
      expect(screen.getByRole('button', { name: ev.label })).toBeDefined()
    }
  })

  it('does not render calendar-scale ticks on the flight scale', () => {
    render(<Timeline />)
    expect(screen.queryByRole('button', { name: 'Flaperon, Réunion' })).toBeNull()
  })

  it('play button toggles clock.playing and its accessible name', async () => {
    const user = userEvent.setup()
    render(<Timeline />)

    const play = screen.getByRole('button', { name: 'Play' })
    expect(useClock.getState().playing).toBe(false)

    await user.click(play)
    expect(useClock.getState().playing).toBe(true)

    const pause = screen.getByRole('button', { name: 'Pause' })
    await user.click(pause)
    expect(useClock.getState().playing).toBe(false)
  })

  it('clicking a tick seeks the clock to that event', async () => {
    const user = userEvent.setup()
    render(<Timeline />)
    const events = eventsForScale('flight')
    const target = events[events.length - 1]
    await user.click(screen.getByRole('button', { name: target.label }))
    expect(useClock.getState().times.flight).toBe(target.t)
  })

  it('step-to-next-event jumps to the first upcoming event', async () => {
    const user = userEvent.setup()
    render(<Timeline />)
    const firstEvent = eventsForScale('flight')[0]
    expect(useClock.getState().times.flight).toBe(FLIGHT_START)
    await user.click(screen.getByRole('button', { name: 'Step to next event' }))
    expect(useClock.getState().times.flight).toBe(firstEvent.t)
  })

  it('speed preset buttons update clock.speed', async () => {
    const user = userEvent.setup()
    render(<Timeline />)
    await user.click(screen.getByRole('button', { name: '600×' }))
    expect(useClock.getState().speed).toBe(600)
  })

  it('exposes the playhead position on the slider', () => {
    render(<Timeline />)
    const slider = screen.getByRole('slider', { name: 'Timeline position' })
    expect(slider.getAttribute('aria-valuenow')).toBe(String(FLIGHT_START))
  })
})
