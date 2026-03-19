import { useEffect, useState } from 'react'
import type { ProviderName, TestConnectionResult } from '../../../../../preload/index.d'
import ProviderCard from '../../../components/ui/ProviderCard'
import TextInput from '../../../components/ui/TextInput'
import Button from '../../../components/ui/Button'

interface Step3LanguageModelProps {
  onNext: () => void
  onBack: () => void
}

const PROVIDERS: { id: ProviderName; name: string; description: string }[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'Use GPT-4o and other OpenAI models to generate summaries'
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Use Claude to generate intelligent, accurate summaries'
  },
  {
    id: 'compatible',
    name: 'Local / Compatible',
    description: 'Use any OpenAI-compatible server (Ollama, LM Studio, etc.)'
  }
]

type TestState =
  | { status: 'idle' }
  | { status: 'testing' }
  | { status: 'success'; model: string }
  | { status: 'error'; message: string }

export default function Step3LanguageModel({ onNext, onBack }: Step3LanguageModelProps): React.JSX.Element {
  const [provider, setProvider] = useState<ProviderName>('openai')
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [compatApiKey, setCompatApiKey] = useState('')
  const [testState, setTestState] = useState<TestState>({ status: 'idle' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setApiKey('')
    setBaseUrl('')
    setCompatApiKey('')
    setTestState({ status: 'idle' })
  }, [provider])

  useEffect(() => {
    const unsub = window.api.settings.onTestResult(
      ({ provider: _p, result }: { provider: string; result: TestConnectionResult }) => {
        if (result.success) {
          setTestState({ status: 'success', model: result.model })
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
      onNext()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-md">
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

        {/* Provider selection */}
        <div className="flex flex-col gap-2">
          {PROVIDERS.map((p) => (
            <ProviderCard
              key={p.id}
              name={p.name}
              description={p.description}
              selected={provider === p.id}
              onClick={() => setProvider(p.id)}
            />
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
            disabled={
              testState.status === 'testing' ||
              (provider === 'compatible' ? !baseUrl : !apiKey)
            }
            loading={testState.status === 'testing'}
          >
            Test Connection
          </Button>

          {testState.status === 'success' && (
            <p className="text-xs text-[var(--color-success)] text-center">
              Connected — model: {testState.model}
            </p>
          )}
          {testState.status === 'error' && (
            <p className="text-xs text-[var(--color-error)] text-center">
              {testState.message}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <div className="flex items-center gap-3">
          <Button variant="text" onClick={onNext}>
            Skip for now
          </Button>
          <Button variant="primary" onClick={handleFinish} loading={saving}>
            Finish Setup
          </Button>
        </div>
      </div>
    </div>
  )
}
