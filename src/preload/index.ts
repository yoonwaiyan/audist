import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

type IpcListener<T> = (data: T) => void

function listen<T>(channel: string, cb: IpcListener<T>): () => void {
  const handler = (_: Electron.IpcRendererEvent, data: T): void => cb(data)
  ipcRenderer.on(channel, handler)
  return () => ipcRenderer.removeListener(channel, handler)
}

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
  whisper: {
    isReady: (): Promise<boolean> => ipcRenderer.invoke('audist:whisper:is-ready'),
    install: (): Promise<void> => ipcRenderer.invoke('audist:whisper:install'),
    onBootstrap: (cb: IpcListener<{ stage: string; percent: number }>) =>
      listen('audist:whisper:bootstrap', cb),
    onReady: (cb: IpcListener<Record<string, never>>) => listen('audist:whisper:ready', cb)
  },
  transcription: {
    retry: (sessionDir: string): Promise<void> =>
      ipcRenderer.invoke('audist:transcription:retry', sessionDir),
    onProgress: (cb: IpcListener<{ sessionId: string; percent: number; stage: string }>) =>
      listen('audist:transcription:progress', cb),
    onComplete: (cb: IpcListener<{ sessionId: string }>) =>
      listen('audist:transcription:complete', cb),
    onError: (cb: IpcListener<{ sessionId: string; code: string; message: string }>) =>
      listen('audist:transcription:error', cb)
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
      ipcRenderer.send('audist:recording:system-audio-chunk', chunk),
    onSaved: (cb: IpcListener<{ sessionDir: string }>) => listen('audist:recording:saved', cb)
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
