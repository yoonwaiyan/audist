import { ipcMain } from 'electron'
import { readdirSync, readFileSync, existsSync, statSync } from 'fs'
import { join } from 'path'
import { getSaveDirectory } from '../store'

export interface SessionMeta {
  id: string
  dir: string
  duration: number
  status: 'complete' | 'transcribing' | 'summarising' | 'error'
  error?: string
  summaryErrorCode?: string
}

export function registerSessionHandlers(): void {
  ipcMain.handle('audist:session:list', (): SessionMeta[] => {
    const root = getSaveDirectory()
    if (!root || !existsSync(root)) return []

    return readdirSync(root)
      .filter((name) => {
        const full = join(root, name)
        return statSync(full).isDirectory() && existsSync(join(full, 'session.json'))
      })
      .sort((a, b) => b.localeCompare(a)) // newest-first (dirs are named YYYY-MM-DD_HH-MM-SS)
      .map((name) => {
        const dir = join(root, name)
        try {
          const raw = JSON.parse(readFileSync(join(dir, 'session.json'), 'utf-8'))
          return {
            id: name,
            dir,
            duration: raw.duration ?? 0,
            status: raw.status ?? 'complete',
            ...(raw.error ? { error: raw.error } : {}),
            ...(raw.summaryErrorCode ? { summaryErrorCode: raw.summaryErrorCode } : {})
          } as SessionMeta
        } catch {
          return { id: name, dir, duration: 0, status: 'complete' } as SessionMeta
        }
      })
  })
}
