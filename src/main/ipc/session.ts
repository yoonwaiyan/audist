import { ipcMain, BrowserWindow } from 'electron'
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'fs'
import { join } from 'path'
import { getSaveDirectory } from '../store'

export interface SessionMeta {
  id: string
  dir: string
  duration: number
  status: 'complete' | 'transcribing' | 'summarising' | 'error'
  error?: string
  summaryErrorCode?: string
  title?: string
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
            ...(raw.summaryErrorCode ? { summaryErrorCode: raw.summaryErrorCode } : {}),
            ...(raw.title ? { title: raw.title } : {})
          } as SessionMeta
        } catch {
          return { id: name, dir, duration: 0, status: 'complete' } as SessionMeta
        }
      })
  })

  ipcMain.handle(
    'audist:session:rename',
    (event, { sessionDir, title }: { sessionDir: string; title: string }): void => {
      const metaPath = join(sessionDir, 'session.json')
      try {
        const existing = existsSync(metaPath)
          ? (JSON.parse(readFileSync(metaPath, 'utf-8')) as Record<string, unknown>)
          : {}
        writeFileSync(metaPath, JSON.stringify({ ...existing, title }), 'utf-8')
        const win = BrowserWindow.fromWebContents(event.sender)
        if (win && !win.isDestroyed()) {
          win.webContents.send('audist:session:renamed', { sessionDir, title })
        }
      } catch {
        // Non-critical
      }
    }
  )
}
