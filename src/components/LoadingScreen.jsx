import { useEffect, useRef, useState } from 'react'

const STAGES = [
  { at: 0,  text: 'Initializing…' },
  { at: 10, text: 'Loading map data…' },
  { at: 40, text: 'Processing geography…' },
  { at: 62, text: 'Building 3D globe…' },
  { at: 80, text: 'Rendering…' },
  { at: 96, text: 'Almost ready…' },
  { at: 100, text: 'Ready!' },
]

const getStageText = (p) => {
  for (let i = STAGES.length - 1; i >= 0; i--) {
    if (p >= STAGES[i].at) return STAGES[i].text
  }
  return 'Loading…'
}

export default function LoadingScreen({ progress, visible }) {
  const [display, setDisplay] = useState(0)
  const rafRef   = useRef(null)
  const fromRef  = useRef(0)
  const startRef = useRef(null)

  // Smoothly animate the counter to new progress value
  useEffect(() => {
    const target = progress
    const from   = fromRef.current
    if (target === from) return

    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    startRef.current = null

    const step = (ts) => {
      if (!startRef.current) startRef.current = ts
      const elapsed = ts - startRef.current
      const dur = Math.max(300, Math.abs(target - from) * 12) // faster for big jumps
      const t   = Math.min(elapsed / dur, 1)
      const ease = 1 - Math.pow(1 - t, 3)           // ease-out cubic
      const val  = Math.round(from + (target - from) * ease)
      setDisplay(val)
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step)
      } else {
        fromRef.current = target
      }
    }
    rafRef.current = requestAnimationFrame(step)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [progress])

  return (
    <div className={`loading-screen${visible ? '' : ' loading-screen--hidden'}`}>
      {/* Animated dot grid background */}
      <div className="loading-bg" aria-hidden="true">
        {Array.from({ length: 80 }).map((_, i) => (
          <div key={i} className="loading-dot"
            style={{ animationDelay: `${(i * 0.13) % 3}s`, opacity: Math.random() * 0.4 + 0.1 }}
          />
        ))}
      </div>

      <div className="loading-content">
        <div className="loading-brand">GLOBAL INSIGHTS</div>

        {/* Big animated percentage */}
        <div className="loading-pct-wrap">
          <span className="loading-pct">{display}</span>
          <span className="loading-pct-sym">%</span>
        </div>

        {/* Progress bar */}
        <div className="loading-bar-track">
          <div
            className="loading-bar-fill"
            style={{ width: `${progress}%` }}
          />
          <div
            className="loading-bar-glow"
            style={{ left: `${progress}%` }}
          />
        </div>

        {/* Status text */}
        <div className="loading-status">{getStageText(display)}</div>
      </div>
    </div>
  )
}
