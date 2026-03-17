import { ipcMain, dialog, BrowserWindow, app } from 'electron'
import { mkdirSync, existsSync, accessSync, constants } from 'fs'
import { join, normalize } from 'path'
import { getSaveDirectory, setSaveDirectory } from '../store'

function formatSessionName(): string {
  const now = new Date()
  const pad = (n: number): string => String(n).padStart(2, '0')
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  const time = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`
  return `${date}_${time}`
}

function isDirectoryAccessible(dirPath: string): boolean {
  try {
    accessSync(dirPath, constants.R_OK | constants.W_OK)
    return true
  } catch {
    return false
  }
}

export function registerDirectoryHandlers(): void {
  ipcMain.handle('audist:directory:get', () => {
    return getSaveDirectory() ?? null
  })

  ipcMain.handle('audist:directory:verify', () => {
    const dir = getSaveDirectory()
    if (!dir) return false
    return existsSync(dir) && isDirectoryAccessible(dir)
  })

  ipcMain.handle(
    'audist:directory:select',
    async (event): Promise<{ path: string | null; error: string | null }> => {
      const win = BrowserWindow.fromWebContents(event.sender)
      const result = await dialog.showOpenDialog(win!, {
        properties: ['openDirectory', 'createDirectory'],
        title: 'Choose Save Folder',
        buttonLabel: 'Select Folder'
      })
      if (result.canceled || result.filePaths.length === 0) return { path: null, error: null }

      const selected = normalize(result.filePaths[0])

      if (!existsSync(selected)) {
        return { path: null, error: 'Selected folder does not exist.' }
      }
      try {
        accessSync(selected, constants.W_OK)
      } catch {
        return { path: null, error: 'Selected folder is not writable.' }
      }

      const appPath = normalize(app.getAppPath())
      if (selected === appPath || selected.startsWith(appPath + '/')) {
        return { path: null, error: 'Cannot save inside the application bundle.' }
      }

      setSaveDirectory(selected)
      return { path: selected, error: null }
    }
  )

  ipcMain.handle('audist:session:create', () => {
    const root = getSaveDirectory()
    if (!root) throw new Error('No save directory configured')
    if (!existsSync(root) || !isDirectoryAccessible(root)) {
      throw new Error('Save directory is not accessible')
    }
    const sessionDir = join(root, formatSessionName())
    mkdirSync(sessionDir, { recursive: true })
    return sessionDir
  })
}
