import { app, Menu } from 'electron'
import { platform } from 'process'
import { focusOrOpenPrefsWindow } from './windows/prefs'

const preferencesMenuItem: Electron.MenuItemConstructorOptions = {
  label: 'Preferences…',
  accelerator: 'CmdOrCtrl+,',
  click: () => focusOrOpenPrefsWindow()
}

function buildMenu(): Electron.MenuItemConstructorOptions[] {
  if (platform === 'darwin') {
    return [
      {
        label: app.name,
        submenu: [
          preferencesMenuItem,
          { type: 'separator' },
          { role: 'hide' },
          { role: 'hideOthers' },
          { role: 'unhide' },
          { type: 'separator' },
          { role: 'quit' }
        ]
      },
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          { role: 'selectAll' }
        ]
      },
      {
        label: 'Window',
        submenu: [{ role: 'minimize' }, { role: 'zoom' }, { role: 'front' }]
      }
    ]
  }

  // Windows and Linux: Preferences under File menu
  return [
    {
      label: 'File',
      submenu: [preferencesMenuItem, { type: 'separator' }, { role: 'quit' }]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    }
  ]
}

export function setApplicationMenu(): void {
  Menu.setApplicationMenu(Menu.buildFromTemplate(buildMenu()))
}
