// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook, act, cleanup } from '@testing-library/react'
import {
  useClock,
  useCurrentTime,
  useProgress,
  FLIGHT_START,
  FLIGHT_END,
  CAL_START,
} from './clock'

const initialState = useClock.getState()

beforeEach(() => {
  useClock.setState(initialState, true)
})

afterEach(cleanup)

describe('useCurrentTime', () => {
  it('returns the playhead of the active scale', () => {
    const { result } = renderHook(useCurrentTime)
    expect(result.current).toBe(FLIGHT_START)
  })

  it('follows scale switches', () => {
    const { result } = renderHook(useCurrentTime)
    act(() => useClock.getState().setScale('calendar'))
    expect(result.current).toBe(CAL_START)
  })

  it('updates when time is set', () => {
    const { result } = renderHook(useCurrentTime)
    act(() => useClock.getState().setTime(FLIGHT_START + 5000))
    expect(result.current).toBe(FLIGHT_START + 5000)
  })
})

describe('useProgress', () => {
  it('is 0 at the range start', () => {
    const { result } = renderHook(useProgress)
    expect(result.current).toBe(0)
  })

  it('is 1 at the range end', () => {
    const { result } = renderHook(useProgress)
    act(() => useClock.getState().setTime(FLIGHT_END))
    expect(result.current).toBe(1)
  })

  it('is the exact fraction at the midpoint', () => {
    const { result } = renderHook(useProgress)
    act(() => useClock.getState().setTime((FLIGHT_START + FLIGHT_END) / 2))
    expect(result.current).toBeCloseTo(0.5, 10)
  })

  it('stays within [0,1] because setTime clamps', () => {
    const { result } = renderHook(useProgress)
    act(() => useClock.getState().setTime(FLIGHT_END + 10_000_000))
    expect(result.current).toBe(1)
    act(() => useClock.getState().setTime(FLIGHT_START - 10_000_000))
    expect(result.current).toBe(0)
  })
})
