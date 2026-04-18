import { useCallback, useEffect, useRef, useState } from 'react'
import { Info } from 'lucide-react'
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

function InputMeter({ label, level }: { label: string; level: number }): React.JSX.Element {
  const segs = 16
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-[var(--color-text-muted)] min-w-[84px]">{label}</span>
      <div className="flex gap-0.5">
        {Array.from({ length: segs }).map((_, i) => {
          const on = i / segs < level
          const hot = i / segs > 0.82
          return (
            <div
              key={i}
              className="w-0.5 h-2.5 rounded-sm transition-colors duration-75"
              style={{
                background: on
                  ? (hot ? 'var(--color-warning)' : 'var(--color-success)')
                  : 'var(--color-bg-surface-hover)'
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

export default function RecordingPage(): React.JSX.Element {
  const { state, sessionDir, analyserRef, stopRecording } = useRecorderContext()
  const [elapsed, setElapsed] = useState(0)
  const [activeProvider, setActiveProvider] = useState<ProviderName | null>(null)
  const [paused, setPaused] = useState(false)
  const [labelEdit, setLabelEdit] = useState(false)
  const [label, setLabel] = useState('Untitled recording')
  const [micLevel, setMicLevel] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const rafRef = useRef<number | null>(null)
  const isStarting = state === 'starting'
  const isStopping = state === 'stopping'

  useEffect(() => {
    void window.api.settings.getLLMSettings().then((s) => {
      if (s.activeProvider) setActiveProvider(s.activeProvider)
    })
  }, [])

  // Timer
  useEffect(() => {
    setElapsed(0)
    intervalRef.current = setInterval(() => {
      if (!paused) setElapsed((s) => s + 1)
    }, 1000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [paused])

  // Real input level from analyser (single RMS value drives both meters)
  useEffect(() => {
    if (paused || !analyserRef.current) {
      setMicLevel(0)
      return
    }
    const analyser = analyserRef.current
    const data = new Uint8Array(analyser.frequencyBinCount)
    function tick(): void {
      analyser.getByteFrequencyData(data)
      const rms = Math.sqrt(data.reduce((sum, v) => sum + (v / 255) ** 2, 0) / data.length)
      setMicLevel(Math.min(1, rms * 3.5))
      rafRef.current = requestAnimationFrame(tick)
    }
    tick()
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current) }
  }, [paused, analyserRef])

  const handleStop = useCallback((): void => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    const trimmed = label.trim()
    if (sessionDir && trimmed && trimmed !== 'Untitled recording') {
      void window.api.session.rename(sessionDir, trimmed)
    }
    void stopRecording(elapsed)
  }, [stopRecording, elapsed, label, sessionDir])

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 px-10 select-none">
      {/* REC badge + session label */}
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-[var(--color-recording-dim)] border border-[var(--color-recording)]/35 text-[var(--color-recording)]">
          <span
            className={`w-2 h-2 rounded-full bg-[var(--color-recording)] shrink-0 ${isStarting ? 'animate-pulse' : 'animate-rec-pulse'}`}
          />
          <span className="font-mono tracking-wider">{isStarting ? 'STARTING…' : 'REC'}</span>
        </span>
        {labelEdit ? (
          <input
            autoFocus
            defaultValue={label}
            onBlur={(e) => { setLabel(e.target.value); setLabelEdit(false) }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { setLabel((e.target as HTMLInputElement).value); setLabelEdit(false) }
              if (e.key === 'Escape') setLabelEdit(false)
            }}
            className="bg-[var(--color-bg-surface)] border border-[var(--color-border-strong)] rounded-md px-2 py-1 text-[13px] text-[var(--color-text-primary)] outline-none min-w-[200px]"
          />
        ) : (
          <button
            onClick={() => setLabelEdit(true)}
            className="text-[13px] font-medium text-[var(--color-text-secondary)] cursor-text bg-transparent border-none px-2 py-1 rounded-md hover:bg-[var(--color-bg-surface)] transition-colors flex items-center gap-1.5"
          >
            {label}
            <span className="text-[10px] text-[var(--color-text-tertiary)] opacity-60">✎</span>
          </button>
        )}
      </div>

      {/* Timer */}
      <div
        className="font-mono font-light text-[var(--color-text-primary)] tabular-nums leading-none tracking-tight"
        style={{ fontSize: 64 }}
      >
        {formatElapsed(elapsed)}
        {paused && (
          <span className="text-sm text-[var(--color-text-tertiary)] ml-3 font-normal">paused</span>
        )}
      </div>

      {/* Waveform */}
      <Waveform active={!isStopping && !paused} analyserRef={analyserRef} />

      {/* Input meters — single RMS level drives both (both go through the same analyser) */}
      <div className="flex items-center gap-6">
        <InputMeter label="Microphone" level={micLevel} />
        <InputMeter label="System audio" level={micLevel * 0.7} />
      </div>

      {/* Controls: pause + stop + marker */}
      <div className="flex items-center gap-2.5">
        {/* Pause */}
        <button
          onClick={() => setPaused((p) => !p)}
          disabled={isStopping || isStarting}
          title={paused ? 'Resume (Space)' : 'Pause (Space)'}
          className="w-11 h-11 rounded-full bg-[var(--color-bg-surface)] border border-[var(--color-border-strong)] flex items-center justify-center text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface-hover)] transition-colors cursor-default disabled:opacity-40"
        >
          {paused ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
          )}
        </button>

        {/* Stop */}
        <button
          onClick={handleStop}
          disabled={isStopping || isStarting}
          title="Stop recording (⌘⇧R)"
          className="w-16 h-16 rounded-full flex items-center justify-center text-white disabled:opacity-60 transition-all cursor-default"
          style={{
            background: 'var(--color-recording)',
            boxShadow: '0 0 0 6px var(--color-recording-dim), 0 10px 30px oklch(0.5 0.2 25 / 0.4)',
          }}
        >
          {(isStopping || isStarting) ? (
            <span className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
          ) : (
            <span className="w-6 h-6 rounded-sm bg-white" />
          )}
        </button>

        {/* Marker */}
        <button
          title="Add marker (M)"
          disabled={isStopping || isStarting}
          className="w-11 h-11 rounded-full bg-[var(--color-bg-surface)] border border-[var(--color-border-strong)] flex items-center justify-center text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface-hover)] font-mono font-semibold text-[13px] transition-colors cursor-default disabled:opacity-40"
        >
          M
        </button>
      </div>

      {/* Info hint */}
      <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-tertiary)] mt-1">
        <Info className="w-3 h-3" />
        <span>Transcription runs after you stop. Keep this window open or minimised.</span>
      </div>

      {/* Active settings */}
      {activeProvider && (
        <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-tertiary)]" style={{ marginTop: -8 }}>
          <span>LLM:</span>
          <span className="text-[var(--color-text-muted)] font-medium">{PROVIDER_LABELS[activeProvider]}</span>
        </div>
      )}
    </div>
  )
}
