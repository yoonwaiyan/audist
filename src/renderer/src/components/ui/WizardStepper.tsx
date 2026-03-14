interface WizardStepperProps {
  steps: string[]
  currentStep: number // 0-indexed
}

function CheckIcon(): React.JSX.Element {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

export default function WizardStepper({ steps, currentStep }: WizardStepperProps): React.JSX.Element {
  return (
    <div className="flex items-start gap-0">
      {steps.map((label, i) => {
        const isComplete = i < currentStep
        const isActive = i === currentStep

        return (
          <div key={i} className="flex items-start">
            {/* Step */}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={[
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors',
                  isComplete
                    ? 'bg-[var(--color-accent)] text-white'
                    : isActive
                      ? 'border-2 border-[var(--color-accent)] text-[var(--color-accent)]'
                      : 'border-2 border-[var(--color-border)] text-[var(--color-text-muted)]'
                ].join(' ')}
              >
                {isComplete ? <CheckIcon /> : i + 1}
              </div>
              <span
                className={[
                  'text-xs text-center max-w-[64px]',
                  isActive ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-muted)]'
                ].join(' ')}
              >
                {label}
              </span>
            </div>

            {/* Connector line */}
            {i < steps.length - 1 && (
              <div
                className={[
                  'h-px w-12 mt-3.5 mx-1 transition-colors',
                  i < currentStep ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-border)]'
                ].join(' ')}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
