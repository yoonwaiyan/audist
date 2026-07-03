import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { platform } from 'process'
import { is } from '@electron-toolkit/utils'
import { getWindowBounds, setWindowBounds } from '../store'
import { isOnScreen } from './bounds'

export type PrefsSection = 'general' | 'llm' | 'prompt' | 'templates'

let prefsWindow: BrowserWindow | null = null
let isQuitting = false

app.on('before-quit', () => {
  isQuitting = true
})

function buildPrefsWindowOptions(): Electron.BrowserWindowConstructorOptions {
  const savedBounds = getWindowBounds('prefs')
  const bounds = savedBounds && isOnScreen(savedBounds) ? savedBounds : { width: 640, height: 520 }

  const base: Electron.BrowserWindowConstructorOptions = {
    ...bounds,
    minWidth: 640,
    minHeight: 480,
    resizable: true,
    minimizable: false,
    maximizable: false,
    title: 'Preferences',
    show: false,
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  }

  if (platform === 'darwin') {
    return { ...base, titleBarStyle: 'hiddenInset' }
  }

  // Windows and Linux: native frame — no overrides
  return base
}

export function focusOrOpenPrefsWindow(section?: PrefsSection): void {
  if (prefsWindow && !prefsWindow.isDestroyed()) {
    prefsWindow.show()
    prefsWindow.focus()
    if (section) prefsWindow.webContents.send('audist:prefs:navigate', { section })
    return
  }

  prefsWindow = new BrowserWindow(buildPrefsWindowOptions())

  prefsWindow.on('ready-to-show', () => prefsWindow?.show())

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    prefsWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#/prefs`)
  } else {
    prefsWindow.loadFile(join(__dirname, '../renderer/index.html'), { hash: '/prefs' })
  }

  // Hide on close — preserve React state, reopen instantly with no reload.
  // Allow actual close when the app is quitting so window-all-closed fires.
  prefsWindow.on('close', (e) => {
    if (prefsWindow) setWindowBounds('prefs', prefsWindow.getBounds())
    if (!isQuitting) {
      e.preventDefault()
      prefsWindow?.hide()
    }
  })

  prefsWindow.on('closed', () => {
    prefsWindow = null
  })
}
