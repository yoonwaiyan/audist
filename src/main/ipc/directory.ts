import { ipcMain, dialog, BrowserWindow } from 'electron'
import { mkdirSync, existsSync, accessSync, constants } from 'fs'
import { join } from 'path'
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

  ipcMain.handle('audist:directory:select', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showOpenDialog(win!, {
      properties: ['openDirectory', 'createDirectory'],
      title: 'Choose Save Folder',
      buttonLabel: 'Select Folder'
    })
    if (result.canceled || result.filePaths.length === 0) return null
    const selected = result.filePaths[0]
    setSaveDirectory(selected)
    return selected
  })

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
