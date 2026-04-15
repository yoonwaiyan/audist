import { app, Menu, dialog } from 'electron'
import { join } from 'path'
import { platform } from 'process'
import { focusOrOpenPrefsWindow } from './windows/prefs'

const preferencesMenuItem: Electron.MenuItemConstructorOptions = {
  label: 'Preferences…',
  accelerator: 'CmdOrCtrl+,',
  click: () => focusOrOpenPrefsWindow()
}

function showAboutDialog(): void {
  dialog.showMessageBox({
    type: 'info',
    title: `About ${app.name}`,
    message: app.name,
    detail: [
      `Version: ${app.getVersion()}`,
      `Electron: ${process.versions.electron}`,
      `Node: ${process.versions.node}`,
      `Chrome: ${process.versions.chrome}`
    ].join('\n'),
    buttons: ['OK']
  })
}

function buildMenu(): Electron.MenuItemConstructorOptions[] {
  if (platform === 'darwin') {
    app.setAboutPanelOptions({
      applicationName: app.name,
      applicationVersion: app.getVersion(),
      version: `Electron ${process.versions.electron} · Node ${process.versions.node}`,
      iconPath: join(__dirname, '../../resources/icon.png')
    })

    return [
      {
        label: app.name,
        submenu: [
          { label: `About ${app.name}`, click: () => app.showAboutPanel() },
          { type: 'separator' },
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

  // Windows and Linux: Preferences under File menu, About under Help menu
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
    },
    {
      label: 'Help',
      submenu: [{ label: `About ${app.name}`, click: () => showAboutDialog() }]
    }
  ]
}

export function setApplicationMenu(): void {
  Menu.setApplicationMenu(Menu.buildFromTemplate(buildMenu()))
}
