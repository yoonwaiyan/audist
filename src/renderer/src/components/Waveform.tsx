import { useEffect, useRef, useState } from 'react'

const BAR_COUNT = 16

interface WaveformProps {
  active: boolean
  analyserRef: React.RefObject<AnalyserNode | null>
}

export default function Waveform({ active, analyserRef }: WaveformProps): React.JSX.Element {
  const [levels, setLevels] = useState<number[]>(Array(BAR_COUNT).fill(0))
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (!active || !analyserRef.current) {
      setLevels(Array(BAR_COUNT).fill(0))
      return
    }

    const analyser = analyserRef.current
    const dataArray = new Uint8Array(analyser.frequencyBinCount)

    function update(): void {
      analyser.getByteFrequencyData(dataArray)
      const step = Math.floor(dataArray.length / BAR_COUNT)
      const newLevels = Array.from({ length: BAR_COUNT }, (_, i) => {
        // Weight towards lower frequencies — more representative of speech
        const idx = Math.floor(i * step * 0.6)
        return (dataArray[idx] ?? 0) / 255
      })
      setLevels(newLevels)
      rafRef.current = requestAnimationFrame(update)
    }

    update()
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [active, analyserRef])

  return (
    <div className="flex items-center justify-center gap-[3px] h-11 px-1">
      {levels.map((level, i) => {
        const height = active ? Math.max(3, Math.round(level * 36)) : 4
        return (
          <div
            key={i}
            className="w-[3px] rounded-full shrink-0"
            style={{
              height: `${height}px`,
              background: active ? 'var(--color-accent)' : 'var(--color-border)',
              transition: active ? 'height 40ms ease' : 'height 300ms ease, background 300ms ease',
              opacity: active ? 0.5 + level * 0.5 : 1
            }}
          />
        )
      })}
    </div>
  )
}
