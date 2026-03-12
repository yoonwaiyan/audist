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
  },
  permissions: {
    check: (): Promise<{ microphone: string; screen: string }> =>
      ipcRenderer.invoke('audist:permissions:check'),
    requestMic: (): Promise<boolean> => ipcRenderer.invoke('audist:permissions:request-mic'),
    openSettings: (target: 'microphone' | 'screen'): Promise<void> =>
      ipcRenderer.invoke('audist:permissions:open-settings', target)
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
