import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  directory: {
    get: (): Promise<string | null> => ipcRenderer.invoke('audist:directory:get'),
    verify: (): Promise<boolean> => ipcRenderer.invoke('audist:directory:verify'),
    select: (): Promise<string | null> => ipcRenderer.invoke('audist:directory:select')
  },
  session: {
    create: (): Promise<string> => ipcRenderer.invoke('audist:session:create')
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
