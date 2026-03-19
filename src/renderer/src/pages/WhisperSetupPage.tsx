import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Download, AlertCircle } from 'lucide-react'
import AppLogo from '../components/ui/AppLogo'

type RowStatus = 'pending' | 'downloading' | 'complete' | 'error'

interface DownloadRow {
  status: RowStatus
  percent: number
  transferredMb: number
  totalMb: number
}

const ENGINE_TOTAL_MB = 24.5
const MODEL_TOTAL_MB = 142.3

function StepRow({
  title,
  row,
  isPending
}: {
  title: string
  row: DownloadRow
  isPending: boolean
}) {
  const isComplete = row.status === 'complete'
  const isError = row.status === 'error'
  const isDownloading = row.status === 'downloading'

  const iconBg = isComplete
    ? 'bg-success/20 text-success'
    : isError
      ? 'bg-error/20 text-error'
      : 'bg-surface-raised border border-border text-text-secondary'

  const statusText = isComplete
    ? `Complete — ${row.totalMb} MB`
    : isDownloading && row.totalMb > 0
      ? `${row.transferredMb.toFixed(1)} MB of ${row.totalMb} MB`
      : 'Waiting…'

  return (
    <div className={`space-y-3 ${isPending ? 'opacity-50' : ''}`}>
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}>
          {isComplete ? (
            <Check className="w-4 h-4" />
          ) : isError ? (
            <AlertCircle className="w-4 h-4" />
          ) : (
            <Download className="w-4 h-4" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-text-primary text-sm">{title}</h3>
          <p className="text-xs text-text-secondary mt-0.5">{statusText}</p>
        </div>
      </div>

      {isDownloading && (
        <div className="ml-11 space-y-1">
          <div className="h-1.5 bg-surface-raised rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-300"
              style={{ width: `${row.percent}%` }}
            />
          </div>
          <p className="text-xs text-text-tertiary">{Math.round(row.percent)}%</p>
        </div>
      )}
    </div>
  )
}

export default function WhisperSetupPage(): React.JSX.Element {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  const [engine, setEngine] = useState<DownloadRow>({
    status: 'pending',
    percent: 0,
    transferredMb: 0,
    totalMb: ENGINE_TOTAL_MB
  })

  const [model, setModel] = useState<DownloadRow>({
    status: 'pending',
    percent: 0,
    transferredMb: 0,
    totalMb: MODEL_TOTAL_MB
  })

  const startInstall = useCallback(() => {
    setError(null)
    setEngine({ status: 'pending', percent: 0, transferredMb: 0, totalMb: ENGINE_TOTAL_MB })
    setModel({ status: 'pending', percent: 0, transferredMb: 0, totalMb: MODEL_TOTAL_MB })

    const unsubBootstrap = window.api.whisper.onBootstrap(({ stage, percent }) => {
      if (stage === 'installing') {
        setEngine((prev) => ({
          ...prev,
          status: 'downloading',
          percent,
          transferredMb: parseFloat(((percent / 100) * ENGINE_TOTAL_MB).toFixed(1))
        }))
      } else if (stage === 'downloading') {
        // First downloading event — mark engine complete (handles packaged mode where installing is skipped)
        setEngine((prev) =>
          prev.status !== 'complete'
            ? { ...prev, status: 'complete', percent: 100, transferredMb: ENGINE_TOTAL_MB }
            : prev
        )
        setModel((prev) => ({
          ...prev,
          status: 'downloading',
          percent,
          transferredMb: parseFloat(((percent / 100) * MODEL_TOTAL_MB).toFixed(1))
        }))
      }
    })

    const unsubReady = window.api.whisper.onReady(() => {
      setEngine({ status: 'complete', percent: 100, transferredMb: ENGINE_TOTAL_MB, totalMb: ENGINE_TOTAL_MB })
      setModel({ status: 'complete', percent: 100, transferredMb: MODEL_TOTAL_MB, totalMb: MODEL_TOTAL_MB })
      setTimeout(() => navigate('/'), 500)
    })

    window.api.whisper.install().catch((err: unknown) => {
      const raw = err instanceof Error ? err.message : String(err)
      const friendly = raw.includes('git clone')
        ? 'Failed to download whisper.cpp source. Check your internet connection and try again.'
        : raw.includes('make')
          ? 'Failed to compile whisper.cpp. Ensure Xcode Command Line Tools are installed:\n  xcode-select --install'
          : raw
      setError(friendly)
      setEngine((prev) => ({ ...prev, status: prev.status === 'downloading' ? 'error' : prev.status }))
      setModel((prev) => ({ ...prev, status: prev.status === 'downloading' ? 'error' : prev.status }))
      unsubBootstrap()
      unsubReady()
    })

    return () => {
      unsubBootstrap()
      unsubReady()
    }
  }, [navigate])

  useEffect(() => {
    const cleanup = startInstall()
    return cleanup
  }, [startInstall])

  const allComplete = engine.status === 'complete' && model.status === 'complete'
  const hasError = engine.status === 'error' || model.status === 'error'

  return (
    <div className="h-screen w-screen bg-bg-base text-text-primary flex flex-col overflow-hidden">
      {/* macOS traffic lights drag region */}
      <div className="absolute top-0 left-0 right-0 h-10 [-webkit-app-region:drag]" />

      <div className="flex-1 flex items-center justify-center px-8">
        <div className="w-full max-w-xl">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <AppLogo size="lg" />
          </div>

          {/* Heading */}
          <div className="text-center mb-10">
            <h1 className="text-2xl font-bold text-text-primary mb-2">
              {allComplete ? 'Setup Complete' : 'Setting up Audist'}
            </h1>
            <p className="text-sm text-text-secondary">
              {allComplete
                ? 'Whisper is ready to transcribe your recordings'
                : 'Downloading required components for transcription'}
            </p>
          </div>

          {/* Progress card */}
          <div className="bg-surface border border-border rounded-lg p-8 space-y-6">
            <StepRow
              title="Downloading Whisper engine"
              row={engine}
              isPending={false}
            />
            <StepRow
              title="Downloading speech model (base.en)"
              row={model}
              isPending={model.status === 'pending'}
            />

            {error && (
              <div className="p-3 bg-error/10 border border-error/20 rounded text-sm text-error whitespace-pre-line">
                {error}
              </div>
            )}
          </div>

          {/* Actions */}
          {hasError && (
            <div className="mt-8 flex justify-center">
              <button
                onClick={startInstall}
                className="px-5 py-2 rounded-lg bg-accent text-white text-sm font-medium
                  hover:bg-accent-hover transition-colors cursor-default"
              >
                Retry Download
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
