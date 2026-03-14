import { app, safeStorage } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import type { ProviderName } from './llm/types'

interface LLMSettings {
  activeProvider?: ProviderName
  models?: Partial<Record<ProviderName, string>>
  cachedModels?: Partial<Record<ProviderName, string[]>>
  compatibleBaseUrl?: string
}

interface AppSettings {
  saveDirectory?: string
  llm?: LLMSettings
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

// ─────────────────────────────────────────────────────────────────────────────
// LLM settings
// ─────────────────────────────────────────────────────────────────────────────

export function getLLMSettings(): LLMSettings {
  return read().llm ?? {}
}

export function setLLMSettings(llm: LLMSettings): void {
  write({ ...read(), llm: { ...getLLMSettings(), ...llm } })
}

export function getCachedModels(provider: ProviderName): string[] {
  return getLLMSettings().cachedModels?.[provider] ?? []
}

export function setCachedModels(provider: ProviderName, models: string[]): void {
  const current = getLLMSettings()
  setLLMSettings({ cachedModels: { ...current.cachedModels, [provider]: models } })
}

// ─────────────────────────────────────────────────────────────────────────────
// Credential storage (encrypted via safeStorage)
// ─────────────────────────────────────────────────────────────────────────────

function credentialsPath(): string {
  return join(app.getPath('userData'), 'credentials.json')
}

function readCredentials(): Record<string, string> {
  const p = credentialsPath()
  if (!existsSync(p)) return {}
  try {
    return JSON.parse(readFileSync(p, 'utf-8')) as Record<string, string>
  } catch {
    return {}
  }
}

function writeCredentials(creds: Record<string, string>): void {
  writeFileSync(credentialsPath(), JSON.stringify(creds, null, 2), 'utf-8')
}

export function setCredential(key: string, value: string): void {
  if (!safeStorage.isEncryptionAvailable()) {
    // Fallback: store as-is (dev environments without keychain)
    writeCredentials({ ...readCredentials(), [key]: value })
    return
  }
  const encrypted = safeStorage.encryptString(value).toString('base64')
  writeCredentials({ ...readCredentials(), [key]: encrypted })
}

export function getCredential(key: string): string | undefined {
  const creds = readCredentials()
  const stored = creds[key]
  if (!stored) return undefined
  if (!safeStorage.isEncryptionAvailable()) return stored
  try {
    return safeStorage.decryptString(Buffer.from(stored, 'base64'))
  } catch {
    return undefined
  }
}

export function clearCredential(key: string): void {
  const creds = readCredentials()
  delete creds[key]
  writeCredentials(creds)
}

export function isCredentialSet(key: string): boolean {
  return !!readCredentials()[key]
}
