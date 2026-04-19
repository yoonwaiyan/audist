import { spawn } from 'child_process'
import { app } from 'electron'
import { existsSync, statSync, unlinkSync } from 'fs'
import { join } from 'path'

function getFfmpegPath(): string {
  if (app.isPackaged) {
    // ffmpeg-static is in asarUnpack — accessible at the unpacked path at runtime
    const bin = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'
    return join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'ffmpeg-static', bin)
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('ffmpeg-static') as string
}

/**
 * Mix captured mic/system audio into:
 *   audio.wav  — 16 kHz mono PCM for whisper.cpp transcription
 *   audio.m4a  — 16 kHz mono AAC 64 kbps for long-term storage
 *
 * Deletes source capture files on success.
 */
function getUsableCapturePath(sessionDir: string, candidates: string[]): string | null {
  for (const candidate of candidates) {
    const fullPath = join(sessionDir, candidate)
    if (!existsSync(fullPath)) continue
    if (statSync(fullPath).size <= 0) continue
    return fullPath
  }
  return null
}

export async function mixAudio(sessionDir: string): Promise<void> {
  const micPath = getUsableCapturePath(sessionDir, ['mic.webm', 'mic.wav'])
  const systemPath = getUsableCapturePath(sessionDir, ['system.webm', 'system.wav'])
  const audioWavPath = join(sessionDir, 'audio.wav')
  const audioM4aPath = join(sessionDir, 'audio.m4a')

  if (!micPath && !systemPath) {
    throw new Error('No usable capture files found in session directory')
  }

  const ffmpeg = getFfmpegPath()

  await new Promise<void>((resolve, reject) => {
    const inputs = [micPath, systemPath].filter((value): value is string => value !== null)
    const args = ['-y']
    for (const input of inputs) {
      args.push('-i', input)
    }

    const filter =
      inputs.length === 2
        ? '[0:a][1:a]amix=inputs=2:duration=longest:normalize=0[mixed];[mixed]asplit=2[aout1][aout2]'
        : '[0:a]asplit=2[aout1][aout2]'

    args.push(
      '-filter_complex',
      filter,
      '-map',
      '[aout1]',
      '-ar',
      '16000',
      '-ac',
      '1',
      audioWavPath,
      '-map',
      '[aout2]',
      '-ar',
      '16000',
      '-ac',
      '1',
      '-c:a',
      'aac',
      '-b:a',
      '64k',
      audioM4aPath
    )

    const proc = spawn(ffmpeg, args)
    const stderr: string[] = []
    proc.stderr?.on('data', (d: Buffer) => stderr.push(d.toString()))
    proc.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`ffmpeg exited with code ${code}: ${stderr.slice(-3).join('')}`))
    })
    proc.on('error', reject)
  })

  if (micPath && existsSync(micPath)) unlinkSync(micPath)
  if (systemPath && existsSync(systemPath)) unlinkSync(systemPath)
}
