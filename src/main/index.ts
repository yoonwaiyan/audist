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
import { mixAudio } from './ipc/mix'
import { bootstrapWhisper } from './whisper/bootstrap'
import { llmRegistry } from './llm/registry'
import { OpenAIProvider } from './llm/providers/openai'

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

  // Register LLM providers
  llmRegistry.register(new OpenAIProvider())

  setApplicationMenu()
  registerDirectoryHandlers()
  registerPermissionHandlers()
  registerRecordingHandlers()
  registerSessionHandlers()
  registerTranscriptionHandlers()
  registerSettingsHandlers()

  // Bootstrap IPC — renderer calls this from the whisper setup screen
  ipcMain.handle('audist:whisper:install', async (event): Promise<void> => {
    const win = BrowserWindow.fromWebContents(event.sender)
    await bootstrapWhisper((stage, percent) => {
      if (win && !win.isDestroyed()) {
        win.webContents.send('audist:whisper:bootstrap', { stage, percent })
      }
    })
    if (win && !win.isDestroyed()) {
      win.webContents.send('audist:whisper:ready', {})
    }
  })

  // Test-only IPC: invoke mixAudio directly without going through the full recording flow
  if (process.env['AUDIST_TEST_MODE']) {
    ipcMain.handle('audist:test:mix-audio', (_, sessionDir: string) => mixAudio(sessionDir))
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
