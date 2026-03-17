import { useCallback, useEffect, useRef, useState } from 'react'
import type { ProviderName, TestConnectionResult } from '../../../../preload/index.d'

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const PROVIDERS: { id: ProviderName; label: string }[] = [
  { id: 'openai', label: 'OpenAI' },
  { id: 'anthropic', label: 'Anthropic' },
  { id: 'compatible', label: 'OpenAI-compatible' }
]

const ERROR_LABELS: Record<string, string> = {
  AUTH_ERROR: 'Invalid API key',
  RATE_LIMIT: 'Rate limited',
  CONNECTION_ERROR: "Can't connect",
  API_ERROR: 'API error'
}

// ─────────────────────────────────────────────────────────────────────────────
// Test Connection Button
// ─────────────────────────────────────────────────────────────────────────────

type TestState = 'idle' | 'loading' | 'success' | 'error'

interface TestConnectionButtonProps {
  provider: ProviderName
  isConfigured: boolean
  onTest: () => void
  state: TestState
  result: TestConnectionResult | null
}

function TestConnectionButton({
  isConfigured,
  onTest,
  state,
  result
}: TestConnectionButtonProps): React.JSX.Element {
  const label = (): string => {
    if (state === 'loading') return 'Testing…'
    if (state === 'success' && result?.success) return `Connected · ${result.latencyMs} ms`
    if (state === 'error' && result && !result.success)
      return ERROR_LABELS[result.code] ?? 'Failed'
    return 'Test Connection'
  }

  const colorClass = (): string => {
    if (state === 'success')
      return 'bg-[var(--color-success)]/20 text-[var(--color-success)] border-[var(--color-success)]/30'
    if (state === 'error')
      return 'bg-[var(--color-error)]/20 text-[var(--color-error)] border-[var(--color-error)]/30'
    return 'bg-[var(--color-bg-base)] text-[var(--color-text-secondary)] border-[var(--color-border)]'
  }

  const prefix = state === 'success' ? '✓ ' : state === 'error' ? '✕ ' : ''

  return (
    <div className="flex flex-col gap-1.5">
      <button
        onClick={onTest}
        disabled={!isConfigured || state === 'loading'}
        className={`self-start px-3 py-1.5 rounded border text-xs font-medium transition-colors cursor-default
          disabled:opacity-40 disabled:cursor-not-allowed ${colorClass()}`}
      >
        {state === 'loading' && (
          <span className="inline-block w-3 h-3 border border-current border-t-transparent rounded-full animate-spin mr-1.5 align-middle" />
        )}
        {prefix}
        {label()}
      </button>

      {state === 'error' && result && !result.success && (
        <p className="text-xs text-[var(--color-error)] leading-relaxed select-text max-w-sm">
          {result.message}
        </p>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// API Key Field
// ─────────────────────────────────────────────────────────────────────────────

interface ApiKeyFieldProps {
  label: string
  credKey: string
  isSet: boolean
  onSave: (key: string, value: string) => void
  onClear: (key: string) => void
  onEdit: () => void
}

function ApiKeyField({
  label,
  credKey,
  isSet,
  onSave,
  onClear,
  onEdit
}: ApiKeyFieldProps): React.JSX.Element {
  const [value, setValue] = useState('')
  const [editing, setEditing] = useState(false)

  const handleSave = (): void => {
    if (!value.trim()) return
    onSave(credKey, value.trim())
    setValue('')
    setEditing(false)
  }

  const handleClear = (): void => {
    onClear(credKey)
    setValue('')
    setEditing(false)
  }

  const handleChange = (v: string): void => {
    setValue(v)
    onEdit()
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-[var(--color-text-primary)]">{label}</label>
      <div className="flex items-center gap-2">
        {isSet && !editing ? (
          <>
            <span className="flex-1 px-3 py-2 rounded bg-[var(--color-bg-surface)] border border-[var(--color-border)] text-sm text-[var(--color-text-muted)] font-mono">
              ••••••••••••••••
            </span>
            <button
              onClick={() => setEditing(true)}
              className="text-xs px-2.5 py-1.5 rounded bg-[var(--color-bg-base)] border border-[var(--color-border)]
                text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors cursor-default"
            >
              Replace
            </button>
            <button
              onClick={handleClear}
              className="text-xs px-2.5 py-1.5 rounded bg-[var(--color-bg-base)] border border-[var(--color-border)]
                text-[var(--color-error)] hover:text-[var(--color-error)] transition-colors cursor-default"
            >
              Clear
            </button>
          </>
        ) : (
          <>
            <input
              type="password"
              value={value}
              onChange={(e) => handleChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder="Paste API key…"
              className="flex-1 px-3 py-2 rounded bg-[var(--color-bg-surface)] border border-[var(--color-border)]
                text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] font-mono
                focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] transition-colors"
            />
            <button
              onClick={handleSave}
              disabled={!value.trim()}
              className="text-xs px-2.5 py-1.5 rounded bg-[var(--color-accent)] text-white
                hover:bg-[var(--color-accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed
                transition-colors cursor-default"
            >
              Save
            </button>
            {isSet && (
              <button
                onClick={() => {
                  setEditing(false)
                  setValue('')
                }}
                className="text-xs px-2.5 py-1.5 rounded bg-[var(--color-bg-base)] border border-[var(--color-border)]
                  text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors cursor-default"
              >
                Cancel
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function LLMPrefsPage(): React.JSX.Element {
  const [tab, setTab] = useState<ProviderName>('openai')
  const [models, setModels] = useState<Partial<Record<ProviderName, string>>>({
    openai: 'gpt-4o-mini',
    anthropic: 'claude-haiku-4-5'
  })
  const [credentialStatus, setCredentialStatus] = useState<Record<string, boolean>>({})
  const [compatibleBaseUrl, setCompatibleBaseUrl] = useState('')
  const [providerModels, setProviderModels] = useState<
    Partial<Record<ProviderName, string[] | null>>
  >({})

  const [testState, setTestState] = useState<Record<ProviderName, TestState>>({
    openai: 'idle',
    anthropic: 'idle',
    compatible: 'idle'
  })
  const [testResult, setTestResult] = useState<Record<ProviderName, TestConnectionResult | null>>({
    openai: null,
    anthropic: null,
    compatible: null
  })
  const successTimers = useRef<Partial<Record<ProviderName, ReturnType<typeof setTimeout>>>>({})

  useEffect(() => {
    void window.api.settings.getLLMSettings().then((s) => {
      if (s.models) setModels(s.models)
      if (s.compatibleBaseUrl) setCompatibleBaseUrl(s.compatibleBaseUrl)
    })

    const allProviders: ProviderName[] = ['openai', 'anthropic', 'compatible']
    void Promise.all(
      allProviders.map(async (p) => ({ p, models: await window.api.settings.getProviderModels(p) }))
    ).then((results) => {
      setProviderModels(Object.fromEntries(results.map((r) => [r.p, r.models])))
    })

    const credKeys = ['openai.apiKey', 'anthropic.apiKey', 'compatible.apiKey']
    void Promise.all(
      credKeys.map(async (k) => ({ key: k, isSet: await window.api.settings.isCredentialSet(k) }))
    ).then((results) => {
      setCredentialStatus(Object.fromEntries(results.map((r) => [r.key, r.isSet])))
    })

    const unsubCred = window.api.settings.onCredentialStatus(({ key, isSet }) => {
      setCredentialStatus((prev) => ({ ...prev, [key]: isSet }))
    })

    const unsubTest = window.api.settings.onTestResult(({ provider, result }) => {
      const p = provider as ProviderName
      setTestResult((prev) => ({ ...prev, [p]: result as TestConnectionResult }))
      setTestState((prev) => ({ ...prev, [p]: result.success ? 'success' : 'error' }))
      if (result.success) {
        setProviderModels((prev) => ({ ...prev, [p]: result.models ?? [] }))
      }
      if (result.success) {
        if (successTimers.current[p]) clearTimeout(successTimers.current[p])
        successTimers.current[p] = setTimeout(() => {
          setTestState((prev) => ({ ...prev, [p]: 'idle' }))
          setTestResult((prev) => ({ ...prev, [p]: null }))
        }, 8000)
      }
    })

    return () => {
      unsubCred()
      unsubTest()
      Object.values(successTimers.current).forEach((t) => t && clearTimeout(t))
    }
  }, [])

  const handleModelChange = (provider: ProviderName, model: string): void => {
    setModels((prev) => ({ ...prev, [provider]: model }))
    void window.api.settings.setModel(provider, model)
  }

  const handleSaveCredential = (key: string, value: string): void => {
    void window.api.settings.setCredential(key, value)
    const provider = key.split('.')[0] as ProviderName
    resetTestState(provider)
  }

  const handleClearCredential = (key: string): void => {
    void window.api.settings.clearCredential(key)
    const provider = key.split('.')[0] as ProviderName
    resetTestState(provider)
  }

  const resetTestState = (provider: ProviderName): void => {
    if (successTimers.current[provider]) clearTimeout(successTimers.current[provider])
    setTestState((prev) => ({ ...prev, [provider]: 'idle' }))
    setTestResult((prev) => ({ ...prev, [provider]: null }))
  }

  const handleTest = (provider: ProviderName): void => {
    if (successTimers.current[provider]) clearTimeout(successTimers.current[provider])
    setTestState((prev) => ({ ...prev, [provider]: 'loading' }))
    setTestResult((prev) => ({ ...prev, [provider]: null }))
    void window.api.settings.testConnection(provider)
  }

  const isProviderConfigured = useCallback(
    (provider: ProviderName): boolean => {
      if (provider === 'compatible') return !!compatibleBaseUrl.trim()
      return !!credentialStatus[`${provider}.apiKey`]
    },
    [credentialStatus, compatibleBaseUrl]
  )

  return (
    <div className="max-w-lg">
      <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-1">
        Language Model
      </h2>
      <p className="text-xs text-[var(--color-text-muted)] mb-6">
        Configure your AI provider. API keys are encrypted and never leave your device.
      </p>

      {/* Provider tab bar */}
      <div className="flex gap-4 border-b border-[var(--color-border)] mb-6">
        {PROVIDERS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors cursor-default
              ${tab === id
                ? 'border-[var(--color-accent)] text-[var(--color-text-primary)]'
                : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* OpenAI */}
      {tab === 'openai' && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-[var(--color-text-primary)]">Model</label>
            <select
              value={models.openai ?? providerModels.openai?.[0] ?? ''}
              onChange={(e) => handleModelChange('openai', e.target.value)}
              className="w-full px-3 py-2 rounded bg-[var(--color-bg-surface)] border border-[var(--color-border)]
                text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)]
                cursor-default transition-colors"
            >
              {(providerModels.openai ?? []).map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <ApiKeyField
            label="API Key"
            credKey="openai.apiKey"
            isSet={!!credentialStatus['openai.apiKey']}
            onSave={handleSaveCredential}
            onClear={handleClearCredential}
            onEdit={() => resetTestState('openai')}
          />
          <TestConnectionButton
            provider="openai"
            isConfigured={isProviderConfigured('openai')}
            onTest={() => handleTest('openai')}
            state={testState.openai}
            result={testResult.openai}
          />
        </div>
      )}

      {/* Anthropic */}
      {tab === 'anthropic' && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-[var(--color-text-primary)]">Model</label>
            <select
              value={models.anthropic ?? providerModels.anthropic?.[0] ?? ''}
              onChange={(e) => handleModelChange('anthropic', e.target.value)}
              className="w-full px-3 py-2 rounded bg-[var(--color-bg-surface)] border border-[var(--color-border)]
                text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)]
                cursor-default transition-colors"
            >
              {(providerModels.anthropic ?? []).map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <ApiKeyField
            label="API Key"
            credKey="anthropic.apiKey"
            isSet={!!credentialStatus['anthropic.apiKey']}
            onSave={handleSaveCredential}
            onClear={handleClearCredential}
            onEdit={() => resetTestState('anthropic')}
          />
          <TestConnectionButton
            provider="anthropic"
            isConfigured={isProviderConfigured('anthropic')}
            onTest={() => handleTest('anthropic')}
            state={testState.anthropic}
            result={testResult.anthropic}
          />
        </div>
      )}

      {/* OpenAI-compatible */}
      {tab === 'compatible' && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-[var(--color-text-primary)]">Base URL</label>
            <input
              type="text"
              value={compatibleBaseUrl}
              onChange={(e) => {
                setCompatibleBaseUrl(e.target.value)
                resetTestState('compatible')
              }}
              onBlur={() => {
                if (compatibleBaseUrl.trim()) {
                  void window.api.settings.setCompatibleBaseUrl(compatibleBaseUrl.trim())
                }
              }}
              placeholder="http://localhost:11434/v1"
              className="w-full px-3 py-2 rounded bg-[var(--color-bg-surface)] border border-[var(--color-border)]
                text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] font-mono
                focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] transition-colors"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-[var(--color-text-primary)]">Model name</label>
            <input
              type="text"
              value={models.compatible ?? ''}
              onChange={(e) => handleModelChange('compatible', e.target.value)}
              placeholder="llama3"
              className="w-full px-3 py-2 rounded bg-[var(--color-bg-surface)] border border-[var(--color-border)]
                text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]
                focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] transition-colors"
            />
          </div>
          <TestConnectionButton
            provider="compatible"
            isConfigured={isProviderConfigured('compatible')}
            onTest={() => handleTest('compatible')}
            state={testState.compatible}
            result={testResult.compatible}
          />
        </div>
      )}
    </div>
  )
}
