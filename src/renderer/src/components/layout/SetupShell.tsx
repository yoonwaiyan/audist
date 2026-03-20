interface SetupShellProps {
  children: React.ReactNode
}

export default function SetupShell({ children }: SetupShellProps): React.JSX.Element {
  return (
    <div className="h-screen w-screen bg-[var(--color-bg-base)] text-[var(--color-text-primary)] flex flex-col overflow-hidden">
      {/* macOS drag region */}
      <div className="absolute top-0 left-0 right-0 h-10 [-webkit-app-region:drag]" />

      <div className="flex-1 flex items-center justify-center px-8 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
