import { useEffect, useState } from 'react'
import type { ProviderName, TestConnectionResult } from '../../../../../preload/index.d'
import ModelDropdown from '../../../components/ui/ModelDropdown'
import TextInput from '../../../components/ui/TextInput'
import Button from '../../../components/ui/Button'

interface Step3LanguageModelProps {
  onNext: () => void
  onBack: () => void
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider grid data
// ─────────────────────────────────────────────────────────────────────────────

const PROVIDERS: { id: ProviderName; name: string; subtitle: string }[] = [
  { id: 'openai', name: 'OpenAI', subtitle: 'GPT-4o, GPT-4o mini' },
  { id: 'anthropic', name: 'Anthropic', subtitle: 'Claude Sonnet, Haiku' },
  { id: 'compatible', name: 'Local', subtitle: 'Ollama, LM Studio' }
]

// ─────────────────────────────────────────────────────────────────────────────
// TestState
// ─────────────────────────────────────────────────────────────────────────────

type TestState =
  | { status: 'idle' }
  | { status: 'testing' }
  | { status: 'success'; models: string[] }
  | { status: 'error'; message: string }

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function Step3LanguageModel({ onNext, onBack }: Step3LanguageModelProps): React.JSX.Element {
  const [provider, setProvider] = useState<ProviderName>('openai')
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [compatApiKey, setCompatApiKey] = useState('')
  const [testState, setTestState] = useState<TestState>({ status: 'idle' })
  const [selectedModel, setSelectedModel] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setApiKey('')
    setBaseUrl('')
    setCompatApiKey('')
    setTestState({ status: 'idle' })
    setSelectedModel('')
  }, [provider])

  useEffect(() => {
    const unsub = window.api.settings.onTestResult(
      ({ provider: _p, result }: { provider: string; result: TestConnectionResult }) => {
        if (result.success) {
          const models = result.models ?? (result.model ? [result.model] : [])
          setTestState({ status: 'success', models })
          if (models.length > 0) setSelectedModel(models[0])
        } else {
          setTestState({ status: 'error', message: result.message })
        }
      }
    )
    return unsub
  }, [])

  const saveCredentials = async (): Promise<void> => {
    if (provider === 'compatible') {
      if (baseUrl) await window.api.settings.setCompatibleBaseUrl(baseUrl)
      if (compatApiKey) await window.api.settings.setCredential('compatible.apiKey', compatApiKey)
    } else {
      const credKey = provider === 'openai' ? 'openai.apiKey' : 'anthropic.apiKey'
      if (apiKey) await window.api.settings.setCredential(credKey, apiKey)
    }
  }

  const handleTestConnection = async (): Promise<void> => {
    setTestState({ status: 'testing' })
    await saveCredentials()
    await window.api.settings.testConnection(provider)
  }

  const handleFinish = async (): Promise<void> => {
    setSaving(true)
    try {
      await window.api.settings.setProvider(provider)
      await saveCredentials()
      if (selectedModel) await window.api.settings.setModel(provider, selectedModel)
      onNext()
    } finally {
      setSaving(false)
    }
  }

  const isTesting = testState.status === 'testing'
  const canTest = provider === 'compatible' ? !!baseUrl : !!apiKey
  const availableModels = testState.status === 'success' ? testState.models : []

  return (
    <div className="flex flex-col gap-6 w-full max-w-xl">
      <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-lg p-8 flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
            Connect a language model to generate summaries
          </h2>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Choose a provider and enter your credentials. You can always change this later in
            Preferences.
          </p>
        </div>

        {/* Provider grid */}
        <div className="grid grid-cols-3 gap-4">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setProvider(p.id)}
              className={`p-4 rounded-lg border-2 transition-all cursor-default text-center
                ${provider === p.id
                  ? 'border-accent bg-accent/10'
                  : 'border-border bg-surface-raised hover:border-accent/50'
                }`}
            >
              <p className="font-semibold text-sm text-text-primary">{p.name}</p>
              <p className="text-xs text-text-secondary mt-0.5">{p.subtitle}</p>
            </button>
          ))}
        </div>

        {/* Credential inputs */}
        {provider === 'compatible' ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[var(--color-text-secondary)]">Base URL</label>
              <TextInput
                type="text"
                value={baseUrl}
                onChange={setBaseUrl}
                placeholder="http://localhost:11434/v1"
                mono
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[var(--color-text-secondary)]">
                API Key <span className="text-[var(--color-text-muted)]">(optional)</span>
              </label>
              <TextInput
                type="password"
                value={compatApiKey}
                onChange={setCompatApiKey}
                placeholder="sk-…"
                mono
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[var(--color-text-secondary)]">API Key</label>
            <TextInput
              type="password"
              value={apiKey}
              onChange={setApiKey}
              placeholder={provider === 'openai' ? 'sk-…' : 'sk-ant-…'}
              mono
            />
          </div>
        )}

        {/* Test connection */}
        <div className="flex flex-col gap-2">
          <Button
            variant="ghost"
            onClick={handleTestConnection}
            disabled={isTesting || !canTest}
            loading={isTesting}
          >
            Test Connection
          </Button>

          {testState.status === 'success' && (
            <p className="text-xs text-[var(--color-success)] text-center">
              ✓ Connected to {provider === 'openai' ? 'OpenAI' : provider === 'anthropic' ? 'Anthropic' : 'server'}
            </p>
          )}
          {testState.status === 'error' && (
            <p className="text-xs text-[var(--color-error)] text-center">
              {testState.message}
            </p>
          )}
        </div>

        {/* Model dropdown — only after successful connection */}
        {testState.status === 'success' && availableModels.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[var(--color-text-secondary)]">Model</label>
            <ModelDropdown
              models={availableModels.map((id) => ({ id, name: id }))}
              value={selectedModel}
              onChange={setSelectedModel}
              placeholder="Select a model…"
            />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <div className="flex items-center gap-3">
          <Button
            variant="text"
            onClick={async () => {
              await window.api.settings.clearLLMConfig()
              onNext()
            }}
          >
            Skip for now
          </Button>
          <Button
            variant="primary"
            onClick={handleFinish}
            loading={saving}
            disabled={saving || !selectedModel}
          >
            Finish Setup
          </Button>
        </div>
      </div>
    </div>
  )
}
