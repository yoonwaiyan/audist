interface TextInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  mono?: boolean
  disabled?: boolean
  className?: string
}

export default function TextInput({
  value,
  onChange,
  placeholder,
  mono = false,
  disabled = false,
  className = ''
}: TextInputProps): React.JSX.Element {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={[
        'w-full px-3 py-1.5 text-sm rounded-[var(--radius-sm)]',
        'bg-[var(--color-bg-surface)] border border-[var(--color-border)]',
        'text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]',
        'focus:outline-none focus:border-[var(--color-accent)] transition-colors',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        mono ? 'font-mono' : '',
        className
      ].join(' ')}
    />
  )
}
