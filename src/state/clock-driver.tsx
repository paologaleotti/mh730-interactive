// Advances the master clock in real time via requestAnimationFrame while
// playing. Mounted once. Reads/writes the store imperatively so it never
// triggers React re-renders itself.

import { useEffect } from 'react'
import { useClock } from './clock'

// rAF pauses in background tabs; without a cap the first frame after refocus
// would advance the clock by the whole hidden duration (hours at 600x).
const MAX_FRAME_MS = 250

export const ClockDriver = () => {
  useEffect(() => {
    let raf = 0
    let last = performance.now()

    const frame = (now: number) => {
      const dt = Math.min(now - last, MAX_FRAME_MS)
      last = now
      const st = useClock.getState()
      if (st.playing) st.tick(dt)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])

  return null
}
