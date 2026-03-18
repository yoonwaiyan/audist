import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { AppLogo } from '../components/ui'
import { useRecorderContext } from '../contexts/RecorderContext'
import type { ProviderName } from '../../../preload/index.d'

const PROVIDER_LABELS: Record<ProviderName, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  compatible: 'OpenAI-compatible'
}

function MicIcon(): React.JSX.Element {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  )
}

export default function SessionListPage(): React.JSX.Element {
  const { startRecording, error } = useRecorderContext()
  const [activeProvider, setActiveProvider] = useState<ProviderName | null>(null)
  const [selectedModels, setSelectedModels] = useState<Partial<Record<ProviderName, string>>>({})
  const [verifiedProviders, setVerifiedProviders] = useState<ProviderName[]>([])
  const [dropdownOpen, setDropdownOpen] = useState(false)
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

    // Refresh when window regains focus — picks up changes made in prefs window
    const handleFocus = (): void => { void loadSettings() }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [loadSettings])

  // Close dropdown on outside click
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

  const handleStart = (): void => {
    void startRecording()
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 px-8 select-none">
      {/* Logo */}
      <AppLogo size="lg" />

      {/* LLM provider selector */}
      {(() => {
        const displayProvider = activeProvider ?? (verifiedProviders.length > 0 ? verifiedProviders[0] : null)
        const displayModel = displayProvider ? selectedModels[displayProvider] : null
        const isConfigured = verifiedProviders.length > 0

        return (
          <div className="flex flex-col items-center gap-1.5">
            <div ref={dropdownRef} className="relative">
              <button
                onClick={() => isConfigured && setDropdownOpen((o) => !o)}
                disabled={!isConfigured}
                className={[
                  'flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-colors cursor-default',
                  isConfigured
                    ? 'bg-[var(--color-bg-surface-hover)] border-[var(--color-border)] text-[var(--color-text-primary)] hover:border-[var(--color-accent)]/50'
                    : 'bg-[var(--color-bg-surface)] border-[var(--color-border)] text-[var(--color-text-muted)] opacity-50 cursor-not-allowed'
                ].join(' ')}
              >
                <span className="text-[var(--color-text-muted)] text-xs">LLM:</span>
                {displayProvider ? (
                  <span>
                    {PROVIDER_LABELS[displayProvider]}
                    {displayModel && <span className="text-[var(--color-text-muted)]"> · {displayModel}</span>}
                  </span>
                ) : (
                  <span>Not configured</span>
                )}
                <ChevronDown className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" />
              </button>

              {dropdownOpen && (
                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 w-52
                  bg-[var(--color-bg-surface-hover)] border border-[var(--color-border)]
                  rounded-lg shadow-lg py-1 z-50">
                  {verifiedProviders.map((p) => (
                    <button
                      key={p}
                      onClick={() => handleSelectProvider(p)}
                      className="w-full text-left px-4 py-2 text-sm text-[var(--color-text-primary)]
                        hover:bg-[var(--color-bg-surface)] transition-colors flex items-center justify-between cursor-default"
                    >
                      <div>
                        <div>{PROVIDER_LABELS[p]}</div>
                        {selectedModels[p] && (
                          <div className="text-xs text-[var(--color-text-muted)]">{selectedModels[p]}</div>
                        )}
                      </div>
                      {activeProvider === p && (
                        <span className="text-[var(--color-accent)] text-xs">✓</span>
                      )}
                    </button>
                  ))}
                  <div className="border-t border-[var(--color-border)] my-1" />
                  <button
                    onClick={handleOpenLLMPrefs}
                    className="w-full text-left px-4 py-2 text-sm text-[var(--color-accent)]
                      hover:bg-[var(--color-bg-surface)] transition-colors cursor-default"
                  >
                    Configure LLM Settings →
                  </button>
                </div>
              )}
            </div>

            {!isConfigured && (
              <p className="text-xs text-[var(--color-text-muted)] text-center">
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
          </div>
        )
      })()}

      {/* Mic button */}
      <button
        onClick={handleStart}
        className="w-[120px] h-[120px] rounded-full flex items-center justify-center bg-[var(--color-bg-surface)] border-2 border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-bg-surface-hover)] transition-colors cursor-default"
        aria-label="Start recording"
      >
        <MicIcon />
      </button>

      <p className="text-sm text-[var(--color-text-muted)]">Click to start recording</p>

      {/* Static waveform placeholder */}
      <div className="flex items-end gap-[3px] h-6">
        {[0.3, 0.5, 0.7, 0.4, 0.6, 0.8, 0.5, 0.3].map((h, i) => (
          <div
            key={i}
            className="w-[3px] rounded-full bg-[var(--color-border)]"
            style={{ height: `${Math.round(h * 20)}px` }}
          />
        ))}
      </div>

      {error && (
        <p className="text-xs text-[var(--color-error)] max-w-xs text-center">{error}</p>
      )}
    </div>
  )
}
