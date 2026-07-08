'use client'

import { useEffect, useRef } from 'react'

interface Props {
  min: number
  max: number
  step?: number
  value: [number, number]
  onChange: (v: [number, number]) => void
  unit?: string
  format?: (v: number) => string
}

export function RangeSlider({ min, max, step = 1, value, onChange, unit = '', format }: Props) {
  const [lo, hi] = value
  const trackRef = useRef<HTMLDivElement>(null)

  const fmt = (v: number) => format ? format(v) : `${v}${unit}`

  function handleLo(v: number) {
    const clamped = Math.min(v, hi - step)
    onChange([Math.max(min, clamped), hi])
  }
  function handleHi(v: number) {
    const clamped = Math.max(v, lo + step)
    onChange([lo, Math.min(max, clamped)])
  }

  const pctLo = ((lo - min) / (max - min)) * 100
  const pctHi = ((hi - min) / (max - min)) * 100

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex items-center justify-between text-xs" style={{ color: 'var(--theme-text)' }}>
        <span className="font-semibold">{fmt(lo)}</span>
        <span style={{ color: 'var(--theme-text-subtle)' }}>até</span>
        <span className="font-semibold">{fmt(hi)}</span>
      </div>
      <div className="relative h-6" ref={trackRef}>
        <div className="absolute top-1/2 left-0 right-0 h-1 -translate-y-1/2 rounded-full"
          style={{ background: 'var(--theme-input-border)' }} />
        <div className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full"
          style={{
            background: 'var(--theme-primary, #10B981)',
            left: `${pctLo}%`,
            right: `${100 - pctHi}%`,
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={lo}
          onChange={(e) => handleLo(Number(e.target.value))}
          className="range-thumb absolute top-0 left-0 w-full h-6 appearance-none bg-transparent pointer-events-none"
          style={{ zIndex: lo > max - (max - min) * 0.1 ? 5 : 3 }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={hi}
          onChange={(e) => handleHi(Number(e.target.value))}
          className="range-thumb absolute top-0 left-0 w-full h-6 appearance-none bg-transparent pointer-events-none"
          style={{ zIndex: 4 }}
        />
      </div>
      <style jsx>{`
        .range-thumb::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: var(--theme-primary, #10B981);
          border: 2px solid #fff;
          box-shadow: 0 2px 6px rgba(0,0,0,.2);
          cursor: pointer;
          pointer-events: auto;
        }
        .range-thumb::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: var(--theme-primary, #10B981);
          border: 2px solid #fff;
          box-shadow: 0 2px 6px rgba(0,0,0,.2);
          cursor: pointer;
          pointer-events: auto;
        }
      `}</style>
    </div>
  )
}
