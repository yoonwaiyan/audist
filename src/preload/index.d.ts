import { ElectronAPI } from '@electron-toolkit/preload'

export type PermissionStatus = 'granted' | 'denied' | 'not-determined' | 'restricted' | 'unknown'

export interface PermissionsState {
  microphone: PermissionStatus
  screen: PermissionStatus
}

interface DirectoryAPI {
  get: () => Promise<string | null>
  verify: () => Promise<boolean>
  select: () => Promise<string | null>
}

export interface SessionMeta {
  id: string
  dir: string
  duration: number
  status: 'complete' | 'transcribing' | 'summarising' | 'error'
  error?: string
}

interface SessionAPI {
  create: () => Promise<string>
  list: () => Promise<SessionMeta[]>
}

interface PermissionsAPI {
  check: () => Promise<PermissionsState>
  requestMic: () => Promise<boolean>
  openSettings: (target: 'microphone' | 'screen') => Promise<void>
}

type IpcUnsub = () => void

interface WhisperAPI {
  isReady: () => Promise<boolean>
  install: () => Promise<void>
  onBootstrap: (cb: (data: { stage: string; percent: number }) => void) => IpcUnsub
  onReady: (cb: (data: Record<string, never>) => void) => IpcUnsub
}

interface TranscriptionAPI {
  retry: (sessionDir: string) => Promise<void>
  onProgress: (cb: (data: { sessionId: string; percent: number; stage: string }) => void) => IpcUnsub
  onComplete: (cb: (data: { sessionId: string }) => void) => IpcUnsub
  onError: (cb: (data: { sessionId: string; code: string; message: string }) => void) => IpcUnsub
}

interface RecordingAPI {
  getScreenSource: () => Promise<string>
  start: (payload: { sessionDir: string; micSampleRate: number; systemSampleRate: number }) => Promise<void>
  stop: (duration: number) => Promise<void>
  sendMicAudioChunk: (chunk: Uint8Array) => void
  sendSystemAudioChunk: (chunk: Uint8Array) => void
}

interface AppAPI {
  directory: DirectoryAPI
  session: SessionAPI
  permissions: PermissionsAPI
  whisper: WhisperAPI
  transcription: TranscriptionAPI
  recording: RecordingAPI
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: AppAPI
  }
}
