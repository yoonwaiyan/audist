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

export type ProviderName = 'openai' | 'anthropic' | 'compatible'

export interface LLMSettings {
  activeProvider?: ProviderName
  models?: Partial<Record<ProviderName, string>>
  compatibleBaseUrl?: string
}

export type TestConnectionResult =
  | { success: true; model: string; models: string[]; latencyMs: number }
  | { success: false; code: string; message: string }

interface SettingsAPI {
  setCredential: (key: string, value: string) => Promise<void>
  clearCredential: (key: string) => Promise<void>
  isCredentialSet: (key: string) => Promise<boolean>
  setProvider: (provider: ProviderName) => Promise<void>
  setModel: (provider: ProviderName, model: string) => Promise<void>
  setCompatibleBaseUrl: (url: string) => Promise<void>
  getLLMSettings: () => Promise<LLMSettings>
  getProviderModels: (provider: ProviderName) => Promise<string[] | null>
  onCredentialStatus: (cb: (data: { key: string; isSet: boolean }) => void) => IpcUnsub
  testConnection: (provider: ProviderName) => Promise<void>
  onTestResult: (cb: (data: { provider: string; result: TestConnectionResult }) => void) => IpcUnsub
}

interface RecordingAPI {
  getScreenSource: () => Promise<string>
  start: (payload: { sessionDir: string; micSampleRate: number; systemSampleRate: number }) => Promise<void>
  stop: (duration: number) => Promise<void>
  sendMicAudioChunk: (chunk: Uint8Array) => void
  sendSystemAudioChunk: (chunk: Uint8Array) => void
  onSaved: (cb: (data: { sessionDir: string }) => void) => IpcUnsub
}

interface AppAPI {
  directory: DirectoryAPI
  session: SessionAPI
  permissions: PermissionsAPI
  whisper: WhisperAPI
  transcription: TranscriptionAPI
  settings: SettingsAPI
  recording: RecordingAPI
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: AppAPI
  }
}
