import { ElectronAPI } from '@electron-toolkit/preload'

interface DirectoryAPI {
  get: () => Promise<string | null>
  verify: () => Promise<boolean>
  select: () => Promise<string | null>
}

interface SessionAPI {
  create: () => Promise<string>
}

interface AppAPI {
  directory: DirectoryAPI
  session: SessionAPI
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: AppAPI
  }
}
