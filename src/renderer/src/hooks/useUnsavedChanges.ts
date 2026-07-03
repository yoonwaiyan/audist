import { useCallback, useMemo, useState } from 'react'

interface UseUnsavedChangesResult<T> {
  hasUnsavedChanges: boolean
  /** Snapshots `current` (or an explicit value) as the new "saved" baseline. */
  markSaved: (next?: T) => void
}

/**
 * Deep-compares `current` form state against a saved baseline (JSON.stringify equality,
 * sufficient for the plain-data template shape). Call `markSaved()` after a successful
 * save to reset the baseline to the freshly-saved state.
 */
export function useUnsavedChanges<T>(current: T, initial: T): UseUnsavedChangesResult<T> {
  const [saved, setSaved] = useState(initial)

  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(saved) !== JSON.stringify(current),
    [saved, current]
  )

  const markSaved = useCallback(
    (next?: T) => {
      setSaved(next ?? current)
    },
    [current]
  )

  return { hasUnsavedChanges, markSaved }
}
