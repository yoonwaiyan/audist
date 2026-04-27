import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDown, Settings, Cpu, Sparkles } from 'lucide-react'
import { useRecorderContext } from '../contexts/RecorderContext'
import type { ProviderName } from '../../../preload/index.d'
import { SHORTCUTS, formatShortcut } from '../lib/shortcuts'

const PROVIDER_LABELS: Record<ProviderName, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  compatible: 'OpenAI-compatible'
}

function MicIcon(): React.JSX.Element {
  return (
    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  )
}

function WaveformBar({ height, delay }: { height: number; delay: number }): React.JSX.Element {
  const [h, setH] = useState(height)
  useEffect(() => {
    const t = setInterval(() => {
      setH(0.1 + Math.random() * 0.3)
    }, 140 + delay * 20)
    return () => clearInterval(t)
  }, [delay])
  return (
    <div
      className="w-0.5 rounded-full bg-[var(--color-text-tertiary)] transition-all duration-150"
      style={{ height: `${Math.max(3, h * 22)}px` }}
    />
  )
}

export default function SessionListPage(): React.JSX.Element {
  const { startRecording, error } = useRecorderContext()
  const [activeProvider, setActiveProvider] = useState<ProviderName | null>(null)
  const [selectedModels, setSelectedModels] = useState<Partial<Record<ProviderName, string>>>({})
  const [verifiedProviders, setVerifiedProviders] = useState<ProviderName[]>([])
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [hovering, setHovering] = useState(false)
  const [whisperModel, setWhisperModel] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const ALL_PROVIDERS: ProviderName[] = ['openai', 'anthropic', 'compatible']

  const loadSettings = useCallback(async (): Promise<void> => {
    const [s, providerResults] = await Promise.all([
      window.api.settings.getLLMSettings(),
      Promise.all(
        ALL_PROVIDERS.map(async (p) => ({ p, models: await window.api.settings.getProviderModels(p) }))
      )
    ])
    if (s.activeProvider) setActiveProvider(s.activeProvider)
    if (s.models) setSelectedModels(s.models)
    const verified = providerResults.filter((r) => r.models !== null).map((r) => r.p)
    setVerifiedProviders(verified)
  }, [])

  useEffect(() => {
    void loadSettings()
    void window.api.whisper.getModelName().then(setWhisperModel)
    const handleFocus = (): void => { void loadSettings() }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [loadSettings])

  useEffect(() => {
    if (!dropdownOpen) return
    const handleClick = (e: MouseEvent): void => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [dropdownOpen])

  const handleSelectProvider = (p: ProviderName): void => {
    setActiveProvider(p)
    void window.api.settings.setProvider(p)
    setDropdownOpen(false)
  }

  const handleOpenLLMPrefs = (): void => {
    setDropdownOpen(false)
    window.electron.ipcRenderer.send('audist:prefs:open', { section: 'llm' })
  }

  const displayProvider = activeProvider ?? (verifiedProviders.length > 0 ? verifiedProviders[0] : null)
  const displayModel = displayProvider ? selectedModels[displayProvider] : null
  const isConfigured = verifiedProviders.length > 0
  const llmLabel = displayProvider
    ? `${PROVIDER_LABELS[displayProvider]}${displayModel ? ` · ${displayModel}` : ''}`
    : 'Not configured'

  return (
    <div className="flex flex-col items-center justify-center h-full gap-7 px-10 select-none relative">
      {/* Header label */}
      <div className="text-[10.5px] font-medium text-[var(--color-text-tertiary)] uppercase tracking-[1px]">
        Ready to record
      </div>

      {/* Headline */}
      <h1 className="m-0 text-[26px] font-semibold text-[var(--color-text-primary)] tracking-tight text-center leading-tight" style={{ marginTop: -8 }}>
        What are you capturing today?
      </h1>

      {/* Giant mic button */}
      <div className="relative flex items-center justify-center" style={{ marginTop: -4 }}>
        {/* Breathing ring */}
        <span
          className="absolute rounded-full border border-[var(--color-accent)]/35 pointer-events-none animate-breathe"
          style={{ width: 152, height: 152 }}
        />
        <button
          onClick={() => void startRecording()}
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
          style={{
            width: 128,
            height: 128,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 30% 30%, oklch(0.78 0.15 285), oklch(0.60 0.19 285))',
            border: 'none',
            cursor: 'default',
            boxShadow: `0 0 0 8px var(--color-accent-dim), 0 20px 48px oklch(0.50 0.18 285 / 0.4), inset 0 1px 0 oklch(1 0 0 / 0.2)`,
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: hovering ? 'scale(1.04)' : 'scale(1)',
            transition: 'transform 160ms cubic-bezier(0.2, 0.8, 0.2, 1)',
          }}
          aria-label="Start recording"
        >
          <MicIcon />
        </button>
      </div>

      {/* Hint */}
      <div className="flex items-center gap-2 text-[12.5px]" style={{ marginTop: -4 }}>
        <span className="text-[var(--color-text-secondary)]">Press the button</span>
        <span className="text-[var(--color-text-tertiary)]">or</span>
        <kbd className="px-1.5 py-0.5 text-[11px] font-medium rounded bg-[var(--color-bg-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] font-mono">{formatShortcut(SHORTCUTS.startRecording)}</kbd>
        <span className="text-[var(--color-text-secondary)]">to start</span>
      </div>

      {/* Pre-roll ambient waveform */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-0.5 h-6">
          {Array.from({ length: 24 }).map((_, i) => (
            <WaveformBar key={i} height={0.1 + (i % 5) * 0.06} delay={i} />
          ))}
        </div>
        <span className="text-[11px] font-mono text-[var(--color-text-tertiary)]">
          MacBook Pro Mic · System audio
        </span>
      </div>

      {/* LLM picker + whisper info */}
      <div className="flex items-center gap-3.5">
        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => isConfigured && setDropdownOpen((o) => !o)}
            disabled={!isConfigured}
            className={[
              'flex items-center gap-2 h-[30px] px-3 rounded-md border text-[12px] transition-colors cursor-default',
              isConfigured
                ? 'bg-[var(--color-bg-sidebar)] border-[var(--color-border)] text-[var(--color-text-primary)] hover:border-[var(--color-accent)]/40'
                : 'bg-[var(--color-bg-sidebar)] border-[var(--color-border)] text-[var(--color-text-muted)] opacity-50 cursor-not-allowed'
            ].join(' ')}
          >
            <Sparkles className="w-3 h-3 text-[var(--color-accent)]" />
            <span className="text-[var(--color-text-muted)]">Summarise with</span>
            <span className="font-medium text-[var(--color-text-primary)]">{llmLabel}</span>
            <ChevronDown className="w-3 h-3 text-[var(--color-text-muted)]" />
          </button>

          {dropdownOpen && (
            <div className="absolute top-[calc(100%+4px)] left-0 min-w-[240px] bg-[var(--color-bg-surface)] border border-[var(--color-border-strong)] rounded-lg p-1 z-50"
              style={{ boxShadow: 'var(--shadow-3)' }}>
              {verifiedProviders.map((p) => (
                <button
                  key={p}
                  onClick={() => handleSelectProvider(p)}
                  className="w-full text-left px-2.5 py-1.5 rounded-md text-[12.5px] text-[var(--color-text-primary)] flex items-center gap-2.5 transition-colors cursor-default"
                  style={{ background: p === displayProvider ? 'var(--color-bg-surface-hover)' : 'transparent' }}
                  onMouseEnter={(e) => { if (p !== displayProvider) (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-surface-hover)' }}
                  onMouseLeave={(e) => { if (p !== displayProvider) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                >
                  <Sparkles className="w-2.5 h-2.5 text-[var(--color-text-tertiary)]" />
                  <span className="flex-1">
                    {PROVIDER_LABELS[p]}
                    {selectedModels[p] && <span className="text-[var(--color-text-muted)] ml-1">· {selectedModels[p]}</span>}
                  </span>
                  {p === displayProvider && <span className="text-[var(--color-accent)] text-xs">✓</span>}
                </button>
              ))}
              <div className="h-px bg-[var(--color-border)] my-1" />
              <button
                onClick={handleOpenLLMPrefs}
                className="w-full text-left px-2.5 py-1.5 rounded-md text-[12px] text-[var(--color-text-muted)] flex items-center gap-2 hover:bg-[var(--color-bg-surface-hover)] transition-colors cursor-default"
              >
                <Settings className="w-2.5 h-2.5" />
                Configure providers…
              </button>
            </div>
          )}
        </div>

        <div className="w-px h-4 bg-[var(--color-border)]" />

        <div className="flex items-center gap-1.5 text-[11.5px] text-[var(--color-text-muted)]">
          <Cpu className="w-3 h-3" />
          <span>{whisperModel ? `whisper.cpp · ${whisperModel}` : 'whisper.cpp · local'}</span>
        </div>
      </div>

      {!isConfigured && (
        <p className="text-[11.5px] text-[var(--color-text-muted)] text-center" style={{ marginTop: -12 }}>
          No AI provider configured —{' '}
          <button
            onClick={handleOpenLLMPrefs}
            className="text-[var(--color-accent)] hover:underline cursor-default"
          >
            set one up
          </button>{' '}
          to generate summaries.
        </p>
      )}

      {error && (
        <p className="text-[11.5px] text-[var(--color-error)] max-w-xs text-center">{error}</p>
      )}

      {/* Status strip */}
      <div className="absolute left-3 bottom-3 right-3 flex items-center gap-3 text-[11px] text-[var(--color-text-tertiary)] pointer-events-none">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)]" />
          Mic & screen permission granted
        </span>
      </div>
    </div>
  )
}
