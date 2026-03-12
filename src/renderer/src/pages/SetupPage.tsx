import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function SetupPage(): React.JSX.Element {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [picking, setPicking] = useState(false)

  const handleChooseFolder = async (): Promise<void> => {
    setPicking(true)
    setError(null)
    try {
      const selected = await window.api.directory.select()
      if (selected) {
        navigate('/')
      }
      // If null, user cancelled — stay on this page (picker cannot be dismissed without a selection)
    } catch (e) {
      setError('Failed to select a folder. Please try again.')
      console.error(e)
    } finally {
      setPicking(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-full bg-[var(--color-surface-base)] px-8">
      {/* Reserve space for macOS traffic lights */}
      <div className="absolute top-0 left-0 right-0 h-10 [-webkit-app-region:drag]" />

      <div className="flex flex-col items-center gap-6 max-w-sm w-full text-center">
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--color-accent)]/10">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-[var(--color-accent)]"
            aria-hidden="true"
          >
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">
            Choose a Save Folder
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
            Audist will save your recordings, transcripts, and summaries here. Each session gets
            its own timestamped subfolder.
          </p>
        </div>

        <button
          onClick={handleChooseFolder}
          disabled={picking}
          className="w-full py-2.5 px-4 rounded-lg bg-[var(--color-accent)] text-white text-sm font-medium
            hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed
            cursor-default"
        >
          {picking ? 'Opening…' : 'Choose Folder'}
        </button>

        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    </div>
  )
}
