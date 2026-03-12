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

interface SessionAPI {
  create: () => Promise<string>
}

interface PermissionsAPI {
  check: () => Promise<PermissionsState>
  requestMic: () => Promise<boolean>
  openSettings: (target: 'microphone' | 'screen') => Promise<void>
}

interface AppAPI {
  directory: DirectoryAPI
  session: SessionAPI
  permissions: PermissionsAPI
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: AppAPI
  }
}
