import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  directory: {
    get: (): Promise<string | null> => ipcRenderer.invoke('audist:directory:get'),
    verify: (): Promise<boolean> => ipcRenderer.invoke('audist:directory:verify'),
    select: (): Promise<string | null> => ipcRenderer.invoke('audist:directory:select')
  },
  session: {
    create: (): Promise<string> => ipcRenderer.invoke('audist:session:create'),
    list: () => ipcRenderer.invoke('audist:session:list')
  },
  permissions: {
    check: (): Promise<{ microphone: string; screen: string }> =>
      ipcRenderer.invoke('audist:permissions:check'),
    requestMic: (): Promise<boolean> => ipcRenderer.invoke('audist:permissions:request-mic'),
    openSettings: (target: 'microphone' | 'screen'): Promise<void> =>
      ipcRenderer.invoke('audist:permissions:open-settings', target)
  },
  recording: {
    getScreenSource: (): Promise<string> =>
      ipcRenderer.invoke('audist:recording:get-screen-source'),
    start: (payload: {
      sessionDir: string
      micSampleRate: number
      systemSampleRate: number
    }): Promise<void> => ipcRenderer.invoke('audist:recording:start', payload),
    stop: (duration: number): Promise<void> => ipcRenderer.invoke('audist:recording:stop', duration),
    sendMicAudioChunk: (chunk: Uint8Array): void =>
      ipcRenderer.send('audist:recording:mic-audio-chunk', chunk),
    sendSystemAudioChunk: (chunk: Uint8Array): void =>
      ipcRenderer.send('audist:recording:system-audio-chunk', chunk)
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
