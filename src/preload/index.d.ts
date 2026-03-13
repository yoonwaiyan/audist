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
  recording: RecordingAPI
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: AppAPI
  }
}
