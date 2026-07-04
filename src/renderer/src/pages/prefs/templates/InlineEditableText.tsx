import { useEffect, useRef, useState } from 'react'
import { Pencil } from 'lucide-react'

interface InlineEditableTextProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  /** Shared classes applied to both the display span and the input for consistent sizing. */
  className?: string
  inputClassName?: string
  showEditIcon?: boolean
  ariaLabel?: string
  'data-testid'?: string
}

/**
 * Click-to-edit text field: renders as static text until clicked, then becomes an
 * autofocused input. Commits on blur/Enter, discards on Escape.
 */
export default function InlineEditableText({
  value,
  onChange,
  placeholder,
  disabled = false,
  className = '',
  inputClassName = '',
  showEditIcon = false,
  ariaLabel,
  'data-testid': testId
}: InlineEditableTextProps): React.JSX.Element {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  const beginEditing = (): void => {
    setDraft(value)
    setEditing(true)
  }

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  const commit = (): void => {
    setEditing(false)
    const next = draft.trim()
    if (next !== value) onChange(next)
  }

  const cancel = (): void => {
    setDraft(value)
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={draft}
        placeholder={placeholder}
        aria-label={ariaLabel}
        data-testid={testId}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            commit()
          } else if (e.key === 'Escape') {
            e.preventDefault()
            // Stop this Escape from also reaching PrefsLayout's window.close() handler.
            e.stopPropagation()
            cancel()
          }
        }}
        className={`bg-transparent border-b border-[var(--color-accent)] outline-none
          text-[var(--color-text-primary)] cursor-text ${className} ${inputClassName}`}
      />
    )
  }

  return (
    <span
      role="button"
      tabIndex={disabled ? -1 : 0}
      data-testid={testId}
      onClick={() => !disabled && beginEditing()}
      onKeyDown={(e) => {
        if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          beginEditing()
        }
      }}
      className={`group/inline inline-flex items-center gap-1.5 cursor-default rounded
        ${disabled ? '' : 'hover:bg-[var(--color-bg-surface-hover)]'} ${className}`}
    >
      <span className={value ? '' : 'text-[var(--color-text-muted)]'}>{value || placeholder}</span>
      {showEditIcon && !disabled && (
        <Pencil className="w-3 h-3 text-[var(--color-text-muted)] opacity-0 group-hover/inline:opacity-100 transition-opacity" />
      )}
    </span>
  )
}
