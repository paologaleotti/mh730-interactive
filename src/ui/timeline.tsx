import { useRef } from 'react'
import {
  useClock,
  useCurrentTime,
  useProgress,
  RANGES,
  SPEEDS,
  type TimeScale,
} from '../state/clock'
import { eventsForScale } from '../config/events'
import { fmtUTC, fmtLocalMYT, fmtDate } from '../lib/format'

// Keyboard steps (FR-14.2): arrows move a fine step, PageUp/Down a coarse one.
const KEY_STEP: Record<TimeScale, { fine: number; coarse: number }> = {
  flight: { fine: 60_000, coarse: 600_000 }, // 1 min / 10 min
  calendar: { fine: 86_400_000, coarse: 2_592_000_000 }, // 1 day / 30 days
}

export const Timeline = () => {
  const scale = useClock((s) => s.scale)
  const playing = useClock((s) => s.playing)
  const speed = useClock((s) => s.speed)
  const time = useCurrentTime()
  const progress = useProgress()

  const setTime = useClock((s) => s.setTime)
  const setSpeed = useClock((s) => s.setSpeed)
  const toggle = useClock((s) => s.toggle)

  const trackRef = useRef<HTMLDivElement>(null)
  const [start, end] = RANGES[scale]
  const events = eventsForScale(scale)

  const seekFromPointer = (clientX: number) => {
    const el = trackRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const frac = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    setTime(start + frac * (end - start))
  }

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    seekFromPointer(e.clientX)
  }
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.buttons === 1) seekFromPointer(e.clientX)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const { fine, coarse } = KEY_STEP[scale]
    const target =
      e.key === 'ArrowRight' ? time + fine
      : e.key === 'ArrowLeft' ? time - fine
      : e.key === 'PageUp' ? time + coarse
      : e.key === 'PageDown' ? time - coarse
      : e.key === 'Home' ? start
      : e.key === 'End' ? end
      : null
    if (target === null) return
    e.preventDefault()
    setTime(target)
  }

  const stepEvent = (dir: 1 | -1) => {
    const times = events.map((ev) => ev.t)
    const target =
      dir === 1 ? times.find((t) => t > time + 1) : times.findLast((t) => t < time - 1)
    if (target !== undefined) setTime(target)
  }

  const fmtTick = (t: number) => (scale === 'flight' ? fmtUTC(t) : fmtDate(t))

  return (
    <div className="timeline" role="group" aria-label="Timeline">
      <div className="tl-left">
        <span className="tl-scale-label">
          {scale === 'flight' ? 'FLIGHT CLOCK · 7-8 MAR 2014' : 'CALENDAR · 2014-2027'}
        </span>

        <button type="button" className="icon-btn" aria-label="Step to previous event" onClick={() => stepEvent(-1)}>
          ⏮
        </button>
        <button
          type="button"
          className="icon-btn play"
          aria-label={playing ? 'Pause' : 'Play'}
          aria-pressed={playing}
          onClick={toggle}
        >
          {playing ? '❚❚' : '▶'}
        </button>
        <button type="button" className="icon-btn" aria-label="Step to next event" onClick={() => stepEvent(1)}>
          ⏭
        </button>

        <div className="seg seg-sm" role="group" aria-label="Playback speed">
          {SPEEDS[scale].map((s) => (
            <button
              key={s.value}
              type="button"
              className="seg-btn"
              aria-pressed={speed === s.value}
              onClick={() => setSpeed(s.value)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="tl-track-wrap">
        <div
          ref={trackRef}
          className="tl-track"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onKeyDown={onKeyDown}
          role="slider"
          tabIndex={0}
          aria-label="Timeline position"
          aria-valuemin={start}
          aria-valuemax={end}
          aria-valuenow={Math.round(time)}
          aria-valuetext={fmtTick(time)}
        >
          <div className="tl-fill" style={{ width: `${progress * 100}%` }} />
          <div className="tl-playhead" style={{ left: `${progress * 100}%` }} />
        </div>
        {/* Tick buttons live in a sibling overlay: interactive children inside
            a role="slider" element are invalid ARIA. */}
        <div className="tl-ticks" aria-label="Timeline events">
          {events.map((ev) => {
            const left = ((ev.t - start) / (end - start)) * 100
            return (
              <button
                key={ev.id}
                type="button"
                className={`tl-tick tick-${ev.kind}`}
                style={{ left: `${left}%` }}
                title={`${ev.label} · ${fmtTick(ev.t)}`}
                aria-label={ev.label}
                onClick={() => setTime(ev.t)}
              />
            )
          })}
        </div>
      </div>

      <div className="tl-readout">
        {scale === 'flight' ? (
          <>
            <span className="tl-time">{fmtUTC(time)}</span>
            <span className="tl-time-sub">{fmtLocalMYT(time)}</span>
          </>
        ) : (
          <span className="tl-time">{fmtDate(time)}</span>
        )}
      </div>
    </div>
  )
}
