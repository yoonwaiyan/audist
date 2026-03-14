import { ipcMain, BrowserWindow } from 'electron'
import { transcribe } from '@remotion/install-whisper-cpp'
import { writeFile, unlink, writeFileSync, readFileSync, existsSync } from 'fs'
import { join, basename } from 'path'
import { getWhisperDir, WHISPER_VERSION, WHISPER_MODEL, isWhisperReady } from '../whisper/bootstrap'
import { summariseSession } from './summary'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function updateSessionStatus(
  sessionDir: string,
  status: string,
  errorMessage?: string
): void {
  const metaPath = join(sessionDir, 'session.json')
  try {
    const existing = existsSync(metaPath)
      ? (JSON.parse(readFileSync(metaPath, 'utf-8')) as Record<string, unknown>)
      : {}
    const updated = {
      ...existing,
      status,
      ...(errorMessage !== undefined ? { error: errorMessage } : { error: undefined })
    }
    writeFileSync(metaPath, JSON.stringify(updated), 'utf-8')
  } catch {
    // Non-critical — session list will show stale status
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Core transcription pipeline
// ─────────────────────────────────────────────────────────────────────────────

export async function transcribeSession(sessionDir: string, win: BrowserWindow): Promise<void> {
  const sessionId = basename(sessionDir)

  // AUD-11 will produce audio.wav; until then use mic.wav (same format: 16kHz mono PCM)
  const inputPath = join(
    sessionDir,
    existsSync(join(sessionDir, 'audio.wav')) ? 'audio.wav' : 'mic.wav'
  )

  if (!existsSync(inputPath)) {
    const message = 'No audio file found in session directory'
    updateSessionStatus(sessionDir, 'error', message)
    win.webContents.send('audist:transcription:error', { sessionId, code: 'NO_AUDIO', message })
    return
  }

  if (!isWhisperReady()) {
    const message = 'Whisper engine is not installed. Please reinstall.'
    updateSessionStatus(sessionDir, 'error', message)
    win.webContents.send('audist:transcription:error', { sessionId, code: 'NO_BINARY', message })
    return
  }

  updateSessionStatus(sessionDir, 'transcribing')
  win.webContents.send('audist:transcription:progress', { sessionId, percent: 0, stage: 'transcribing' })

  try {
    const result = await transcribe({
      inputPath,
      whisperPath: getWhisperDir(),
      whisperCppVersion: WHISPER_VERSION,
      model: WHISPER_MODEL,
      tokenLevelTimestamps: false,
      tokensPerItem: 0, // 0 is falsy — omits --max-len so whisper segments naturally into sentences
      printOutput: false,
      onProgress: (progress) => {
        if (win.isDestroyed()) return
        win.webContents.send('audist:transcription:progress', {
          sessionId,
          percent: Math.round(progress * 100),
          stage: 'transcribing'
        })
      }
    })

    // Each segment is a natural phrase from whisper — one line per segment
    const lines = result.transcription
      .filter((seg) => seg.text.trim().length > 0)
      .map((seg) => {
        // timestamps.from is "HH:MM:SS,mmm" — strip the milliseconds
        const ts = seg.timestamps.from.split(',')[0]
        return `[${ts}] ${seg.text.trim()}`
      })
    const content = lines.join('\n')

    // Write transcript.txt (non-blocking)
    const transcriptPath = join(sessionDir, 'transcript.txt')
    await new Promise<void>((resolve, reject) => {
      writeFile(transcriptPath, content, 'utf-8', (err) => (err ? reject(err) : resolve()))
    })

    // Success: update status and notify renderer
    updateSessionStatus(sessionDir, 'complete')
    if (!win.isDestroyed()) {
      win.webContents.send('audist:transcription:complete', { sessionId })
    }

    // Delete input audio file only on confirmed success
    unlink(inputPath, () => {})

    // Auto-trigger summarisation (fire-and-forget — runs in background)
    if (!win.isDestroyed()) {
      void summariseSession(sessionDir, win)
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Transcription failed'
    const code =
      message.toLowerCase().includes('binary') || message.toLowerCase().includes('executable')
        ? 'NO_BINARY'
        : 'TRANSCRIPTION_FAILED'
    updateSessionStatus(sessionDir, 'error', message)
    if (!win.isDestroyed()) {
      win.webContents.send('audist:transcription:error', { sessionId, code, message })
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// IPC handlers
// ─────────────────────────────────────────────────────────────────────────────

export function registerTranscriptionHandlers(): void {
  ipcMain.handle('audist:whisper:is-ready', (): boolean => isWhisperReady())

  ipcMain.handle('audist:transcription:retry', (event, sessionDir: string): void => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return
    transcribeSession(sessionDir, win) // fire-and-forget — runs in background
  })
}
