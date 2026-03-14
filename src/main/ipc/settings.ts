import { ipcMain, BrowserWindow } from 'electron'
import {
  setCredential,
  clearCredential,
  isCredentialSet,
  getLLMSettings,
  setLLMSettings
} from '../store'
import { llmRegistry } from '../llm/registry'
import type { ProviderName } from '../llm/types'

export function registerSettingsHandlers(): void {
  // Store an encrypted credential and notify renderer of updated status
  ipcMain.handle(
    'audist:settings:setCredential',
    (event, { key, value }: { key: string; value: string }): void => {
      setCredential(key, value)
      const win = BrowserWindow.fromWebContents(event.sender)
      win?.webContents.send('audist:settings:credentialStatus', { key, isSet: true })
    }
  )

  // Remove a stored credential and notify renderer
  ipcMain.handle(
    'audist:settings:clearCredential',
    (event, { key }: { key: string }): void => {
      clearCredential(key)
      const win = BrowserWindow.fromWebContents(event.sender)
      win?.webContents.send('audist:settings:credentialStatus', { key, isSet: false })
    }
  )

  // Query whether a credential is currently stored (renderer never gets the value)
  // In e2e test mode with a mock LLM provider, always report credentials as set
  // so that the Test Connection button is enabled for all providers.
  ipcMain.handle(
    'audist:settings:isCredentialSet',
    (_, { key }: { key: string }): boolean => {
      if (process.env['AUDIST_TEST_LLM']) return true
      return isCredentialSet(key)
    }
  )

  // Persist active provider selection
  ipcMain.handle(
    'audist:settings:setProvider',
    (_, { provider }: { provider: ProviderName }): void => {
      llmRegistry.setActive(provider)
    }
  )

  // Persist model selection for a provider
  ipcMain.handle(
    'audist:settings:setModel',
    (_, { provider, model }: { provider: ProviderName; model: string }): void => {
      const current = getLLMSettings()
      setLLMSettings({
        models: { ...current.models, [provider]: model }
      })
    }
  )

  // Persist compatible base URL
  ipcMain.handle(
    'audist:settings:setCompatibleBaseUrl',
    (_, { url }: { url: string }): void => {
      setLLMSettings({ compatibleBaseUrl: url })
    }
  )

  // Return current LLM settings (non-sensitive — no credentials)
  ipcMain.handle('audist:settings:getLLMSettings', () => getLLMSettings())

  // Trigger a test connection and push the result back via push event
  ipcMain.handle(
    'audist:llm:testConnection',
    async (event, { provider }: { provider: string }): Promise<void> => {
      const p = llmRegistry.get(provider)
      const win = BrowserWindow.fromWebContents(event.sender)
      if (!p || !win) return

      const result = await p.testConnection()
      if (!win.isDestroyed()) {
        win.webContents.send('audist:llm:testResult', { provider, result })
      }
    }
  )
}
