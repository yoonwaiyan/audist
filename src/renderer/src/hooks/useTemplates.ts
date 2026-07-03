import { useCallback, useEffect, useState } from 'react'
import type { PromptTemplate } from '../../../preload/index.d'

function sortTemplates(templates: PromptTemplate[]): PromptTemplate[] {
  return [...templates].sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  })
}

interface UseTemplatesResult {
  templates: PromptTemplate[]
  isLoading: boolean
  refresh: () => Promise<void>
}

export function useTemplates(): UseTemplatesResult {
  const [templates, setTemplates] = useState<PromptTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const refresh = useCallback(async () => {
    const list = await window.api.templates.list()
    setTemplates(sortTemplates(list))
  }, [])

  useEffect(() => {
    let cancelled = false
    window.api.templates.list().then((list) => {
      if (cancelled) return
      setTemplates(sortTemplates(list))
      setIsLoading(false)
    })

    const unsubscribe = window.api.templates.onChanged(() => {
      void refresh()
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [refresh])

  return { templates, isLoading, refresh }
}
