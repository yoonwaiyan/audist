import { installWhisperCpp, downloadWhisperModel } from '@remotion/install-whisper-cpp'
import { app } from 'electron'
import { existsSync, rmSync, mkdirSync, copyFileSync, chmodSync } from 'fs'
import { join } from 'path'
import { execFileSync } from 'child_process'

export const WHISPER_VERSION = '1.5.5'
export const WHISPER_MODEL = 'base.en' as const

// Set by the mock install handler in e2e tests so that isWhisperReady()
// returns true after the simulated download completes (preventing redirect loops).
let _testInstallComplete = false
export function markTestInstallComplete(): void {
  _testInstallComplete = true
}

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
  if (testOverride === 'not-ready') return _testInstallComplete

  const dir = getWhisperDir()
  return existsSync(whisperBinaryPath(dir)) && existsSync(whisperModelPath(dir))
}

// Prevent iCloud "Optimize Mac Storage" from evicting whisper files after inactivity.
// The com.apple.icloud.donotpresent xattr tells iCloud Drive to keep the directory local.
function markDirectoryAsLocalOnly(dir: string): void {
  if (process.platform !== 'darwin') return
  try {
    execFileSync('xattr', ['-w', 'com.apple.icloud.donotpresent', '', dir])
  } catch {
    // xattr may not be available in all environments; non-fatal
  }
}

export async function bootstrapWhisper(
  onProgress: (stage: 'installing' | 'downloading', percent: number) => void
): Promise<void> {
  const dir = getWhisperDir()
  mkdirSync(dir, { recursive: true })
  markDirectoryAsLocalOnly(dir)

  if (!existsSync(whisperBinaryPath(dir))) {
    if (app.isPackaged) {
      // In a packaged app the binary was pre-compiled and bundled as an extraResource.
      // Copy it into userData so whisper.cpp can find it alongside the model.
      const bundledBin = join(
        process.resourcesPath,
        'whisper-bin',
        process.platform === 'win32' ? 'main.exe' : 'main'
      )
      copyFileSync(bundledBin, whisperBinaryPath(dir))
      if (process.platform !== 'win32') chmodSync(whisperBinaryPath(dir), 0o755)
    } else {
      // Development: git clone + make (requires Xcode CLT / build-essentials)
      // On macOS/Linux, if a previous bootstrap attempt left a partial directory,
      // git clone fails with exit code 128. Wipe it so every attempt starts clean.
      if (existsSync(dir) && !existsSync(whisperBinaryPath(dir))) {
        rmSync(dir, { recursive: true, force: true })
      }

      // Prevent git from hanging on credential prompts in headless Electron environments
      process.env['GIT_TERMINAL_PROMPT'] = '0'
      process.env['GIT_ASKPASS'] = 'echo'

      onProgress('installing', 0)
      await installWhisperCpp({ version: WHISPER_VERSION, to: dir, printOutput: false })
      onProgress('installing', 100)
    }
  }

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
