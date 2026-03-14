import { createContext, useContext } from 'react'
import { useRecorder, type UseRecorderResult } from '../hooks/useRecorder'

const RecorderContext = createContext<UseRecorderResult | null>(null)

export function RecorderProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const recorder = useRecorder()
  return <RecorderContext.Provider value={recorder}>{children}</RecorderContext.Provider>
}

export function useRecorderContext(): UseRecorderResult {
  const ctx = useContext(RecorderContext)
  if (!ctx) throw new Error('useRecorderContext must be used inside RecorderProvider')
  return ctx
}
