import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface ModelOption {
  id: string
  name: string
  description?: string
}

interface ModelDropdownProps {
  models: ModelOption[]
  value: string | undefined
  onChange: (id: string) => void
  placeholder?: string
}

export default function ModelDropdown({
  models,
  value,
  onChange,
  placeholder = 'Select a model…'
}: ModelDropdownProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selected = models.find((m) => m.id === value)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent): void => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div ref={containerRef} data-testid="model-dropdown" className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full px-4 py-2.5 bg-surface-raised border border-border rounded-lg text-left flex items-center justify-between hover:border-accent/50 transition-colors cursor-default"
      >
        <span
          className={
            selected ? 'text-sm font-medium text-text-primary' : 'text-sm text-text-muted'
          }
        >
          {selected ? selected.name : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-text-secondary transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div data-testid="model-dropdown-panel" className="absolute top-full mt-1 w-full bg-surface-raised border border-border rounded-lg shadow-lg py-1 z-50 max-h-64 overflow-y-auto">
          {models.map((model) => (
            <button
              key={model.id}
              type="button"
              onClick={() => {
                onChange(model.id)
                setOpen(false)
              }}
              className="w-full px-4 py-2.5 text-left hover:bg-surface transition-colors cursor-default"
            >
              <p className="text-sm font-medium text-text-primary">{model.name}</p>
              {model.description && (
                <p className="text-xs text-text-secondary mt-0.5">{model.description}</p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
