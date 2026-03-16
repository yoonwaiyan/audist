import { useCallback, useEffect, useRef, useState } from 'react'
import Waveform from '../components/Waveform'
import { useRecorderContext } from '../contexts/RecorderContext'
import type { ProviderName } from '../../../preload/index.d'

const PROVIDER_LABELS: Record<ProviderName, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  compatible: 'OpenAI-compatible'
}

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const pad = (n: number): string => String(n).padStart(2, '0')
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

export default function RecordingPage(): React.JSX.Element {
  const { state, analyserRef, stopRecording } = useRecorderContext()
  const [elapsed, setElapsed] = useState(0)
  const [activeProvider, setActiveProvider] = useState<ProviderName | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isStopping = state === 'stopping'

  useEffect(() => {
    void window.api.settings.getLLMSettings().then((s) => {
      if (s.activeProvider) setActiveProvider(s.activeProvider)
    })
  }, [])

  // Timer
  useEffect(() => {
    setElapsed(0)
    intervalRef.current = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const handleStop = useCallback((): void => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    void stopRecording(elapsed)
  }, [stopRecording, elapsed])

  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 px-8 select-none">
      {/* Timer */}
      <div className="flex items-center gap-2.5">
        <span className="relative flex h-3 w-3 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-recording opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-recording" />
        </span>
        <span className="text-5xl font-bold font-mono text-[var(--color-text-primary)] tabular-nums tracking-tight">
          {formatElapsed(elapsed)}
        </span>
      </div>

      {/* Stop button */}
      <button
        onClick={handleStop}
        disabled={isStopping}
        className="w-[120px] h-[120px] rounded-full flex items-center justify-center bg-[var(--color-error)] ring-4 ring-[var(--color-error)]/30 hover:bg-[var(--color-error)]/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors cursor-default"
        aria-label="Stop recording"
      >
        {isStopping ? (
          <span className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
        ) : (
          <span className="w-10 h-10 rounded-lg bg-white/90" />
        )}
      </button>

      {/* Active settings labels */}
      <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
        <span>
          Template: <span className="text-[var(--color-text-secondary)] font-medium">General Meeting</span>
        </span>
        {activeProvider && (
          <>
            <span className="text-[var(--color-border)]">·</span>
            <span>
              LLM: <span className="text-[var(--color-text-secondary)] font-medium">{PROVIDER_LABELS[activeProvider]}</span>
            </span>
          </>
        )}
      </div>

      {/* Waveform */}
      <Waveform active={!isStopping} analyserRef={analyserRef} />

      {/* Live captions — hidden until real-time transcription is implemented */}
    </div>
  )
}
