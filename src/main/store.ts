import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'

interface AppSettings {
  saveDirectory?: string
}

function settingsPath(): string {
  return join(app.getPath('userData'), 'settings.json')
}

function read(): AppSettings {
  const p = settingsPath()
  if (!existsSync(p)) return {}
  try {
    return JSON.parse(readFileSync(p, 'utf-8')) as AppSettings
  } catch {
    return {}
  }
}

function write(settings: AppSettings): void {
  writeFileSync(settingsPath(), JSON.stringify(settings, null, 2), 'utf-8')
}

export function getSaveDirectory(): string | undefined {
  return read().saveDirectory
}

export function setSaveDirectory(path: string): void {
  write({ ...read(), saveDirectory: path })
}
