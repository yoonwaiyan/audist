import { installWhisperCpp, downloadWhisperModel } from '@remotion/install-whisper-cpp'
import { app } from 'electron'
import { existsSync } from 'fs'
import { join } from 'path'

export const WHISPER_VERSION = '1.5.5'
export const WHISPER_MODEL = 'base.en' as const

export function getWhisperDir(): string {
  return join(app.getPath('userData'), 'whisper.cpp')
}

// For whisper.cpp v1.5.5: binary is 'main', model is 'ggml-<model>.bin'
// (v1.7.4+ uses 'whisper-cli' under build/bin/ — not relevant here)
function whisperBinaryPath(dir: string): string {
  return join(dir, process.platform === 'win32' ? 'main.exe' : 'main')
}

function whisperModelPath(dir: string): string {
  return join(dir, `ggml-${WHISPER_MODEL}.bin`)
}

export function isWhisperReady(): boolean {
  // E2E test override: AUDIST_TEST_WHISPER=ready skips the filesystem check
  const testOverride = process.env['AUDIST_TEST_WHISPER']
  if (testOverride === 'ready') return true
  if (testOverride === 'not-ready') return false

  const dir = getWhisperDir()
  return existsSync(whisperBinaryPath(dir)) && existsSync(whisperModelPath(dir))
}

export async function bootstrapWhisper(
  onProgress: (stage: 'installing' | 'downloading', percent: number) => void
): Promise<void> {
  const dir = getWhisperDir()

  onProgress('installing', 0)
  await installWhisperCpp({ version: WHISPER_VERSION, to: dir, printOutput: false })
  onProgress('installing', 100)

  onProgress('downloading', 0)
  await downloadWhisperModel({
    model: WHISPER_MODEL,
    folder: dir,
    printOutput: false,
    onProgress: (downloaded, total) => {
      const percent = total > 0 ? Math.round((downloaded / total) * 100) : 0
      onProgress('downloading', percent)
    }
  })
  onProgress('downloading', 100)
}
