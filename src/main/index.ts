import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { setApplicationMenu } from './menu'
import { focusOrOpenPrefsWindow, PrefsSection } from './windows/prefs'
import { registerDirectoryHandlers } from './ipc/directory'
import { registerPermissionHandlers } from './ipc/permissions'
import { registerRecordingHandlers } from './ipc/recording'
import { registerSessionHandlers } from './ipc/session'
import { registerTranscriptionHandlers } from './ipc/transcription'
import { registerSettingsHandlers } from './ipc/settings'
import { registerSummaryHandlers, summariseSession } from './ipc/summary'
import { mixAudio } from './ipc/mix'
import { bootstrapWhisper, markTestInstallComplete } from './whisper/bootstrap'
import { llmRegistry } from './llm/registry'
import { OpenAIProvider } from './llm/providers/openai'
import { AnthropicProvider } from './llm/providers/anthropic'
import { CompatibleProvider } from './llm/providers/compatible'
import { MockLLMProvider } from './llm/providers/mock'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    ...(process.platform === 'darwin' ? { titleBarStyle: 'hiddenInset' } : {}),
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Register LLM providers (mock replaces real providers in e2e tests)
  if (process.env['AUDIST_TEST_LLM']) {
    llmRegistry.register(new MockLLMProvider('openai', ['gpt-4o', 'gpt-4o-mini']))
    llmRegistry.register(new MockLLMProvider('anthropic', ['claude-sonnet-4-5', 'claude-haiku-4-5']))
    llmRegistry.register(new MockLLMProvider('compatible', ['ollama-llama3', 'ollama-mistral']))
  } else {
    llmRegistry.register(new OpenAIProvider())
    llmRegistry.register(new AnthropicProvider())
    llmRegistry.register(new CompatibleProvider())
  }

  setApplicationMenu()
  registerDirectoryHandlers()
  registerPermissionHandlers()
  registerRecordingHandlers()
  registerSessionHandlers()
  registerTranscriptionHandlers()
  registerSettingsHandlers()
  registerSummaryHandlers()

  // Bootstrap IPC — renderer calls this from the whisper setup screen
  ipcMain.handle('audist:whisper:install', async (event): Promise<void> => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const send = (stage: string, percent: number): void => {
      if (win && !win.isDestroyed()) {
        win.webContents.send('audist:whisper:bootstrap', { stage, percent })
      }
    }

    // In e2e tests (AUDIST_TEST_WHISPER=not-ready) simulate a fast download
    // sequence instead of running the real bootstrap.
    if (process.env['AUDIST_TEST_WHISPER'] === 'not-ready') {
      const delay = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))
      send('installing', 0)
      await delay(150)
      send('installing', 50)
      await delay(150)
      send('installing', 100)
      await delay(150)
      send('downloading', 0)
      await delay(150)
      send('downloading', 50)
      await delay(150)
      send('downloading', 100)
      await delay(100)
      markTestInstallComplete()
      if (win && !win.isDestroyed()) win.webContents.send('audist:whisper:ready', {})
      return
    }

    await bootstrapWhisper(send)
    if (win && !win.isDestroyed()) {
      win.webContents.send('audist:whisper:ready', {})
    }
  })

  // Test-only IPC: invoke mixAudio / summariseSession directly without the full pipeline
  if (process.env['AUDIST_TEST_MODE']) {
    ipcMain.handle('audist:test:mix-audio', (_, sessionDir: string) => mixAudio(sessionDir))
    ipcMain.handle('audist:test:summarise', (event, sessionDir: string) => {
      const win = BrowserWindow.fromWebContents(event.sender)
      if (!win) return
      return summariseSession(sessionDir, win)
    })
  }

  ipcMain.on('audist:prefs:open', (_, payload?: { section?: PrefsSection }) => {
    focusOrOpenPrefsWindow(payload?.section)
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
