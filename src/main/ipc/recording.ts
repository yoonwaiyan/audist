import { ipcMain, BrowserWindow, desktopCapturer } from 'electron'
import { createWriteStream, writeFileSync } from 'fs'
import { join, basename } from 'path'
import type { WriteStream } from 'fs'
import { mixAudio } from './mix'
import { transcribeSession } from './transcription'

// ─────────────────────────────────────────────────────────────────────────────
// Session state
// ─────────────────────────────────────────────────────────────────────────────

interface SessionState {
  sessionDir: string
  micPath: string
  systemPath: string | null
  micStream: WriteStream
  systemStream: WriteStream | null
  micBytesWritten: number
  systemBytesWritten: number
}

let session: SessionState | null = null
let acceptingChunks = false

// ─────────────────────────────────────────────────────────────────────────────
// IPC handlers
// ─────────────────────────────────────────────────────────────────────────────

export function registerRecordingHandlers(): void {
  // Returns the first available screen source ID for getUserMedia desktop capture
  ipcMain.handle('audist:recording:get-screen-source', async (): Promise<string> => {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Screen recording permission denied')), 3000)
    )
    const sources = await Promise.race([
      desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1, height: 1 } }),
      timeout
    ])
    if (sources.length === 0) throw new Error('No screen sources available')
    return sources[0].id
  })

  // Opens WAV files and writes placeholder headers; both streams are fed from the renderer
  ipcMain.handle(
    'audist:recording:start',
    (
      _,
      payload: {
        sessionDir: string
        hasSystemAudio?: boolean
      }
    ): void => {
      if (session) throw new Error('Recording already active')

      const { sessionDir, hasSystemAudio } = payload
      const micPath = join(sessionDir, 'mic.webm')
      const systemPath = hasSystemAudio ? join(sessionDir, 'system.webm') : null

      const micStream = createWriteStream(micPath)
      const systemStream = systemPath ? createWriteStream(systemPath) : null

      session = {
        sessionDir,
        micPath,
        systemPath,
        micStream,
        systemStream,
        micBytesWritten: 0,
        systemBytesWritten: 0
      }

      acceptingChunks = true
    }
  )

  ipcMain.handle('audist:recording:update-system-audio', (_, available: boolean): void => {
    if (!session) return
    if (!available || session.systemStream) return

    const systemPath = join(session.sessionDir, 'system.webm')
    session.systemPath = systemPath
    session.systemStream = createWriteStream(systemPath)
  })

  // One-way: renderer sends raw Int16 PCM chunks for mic audio
  ipcMain.on('audist:recording:mic-audio-chunk', (_, chunk: Buffer) => {
    if (!acceptingChunks || !session) return
    session.micBytesWritten += chunk.length
    session.micStream.write(chunk)
  })

  // One-way: renderer sends raw Int16 PCM chunks for system audio
  ipcMain.on('audist:recording:system-audio-chunk', (_, chunk: Buffer) => {
    if (!acceptingChunks || !session || !session.systemStream) return
    session.systemBytesWritten += chunk.length
    session.systemStream.write(chunk)
  })

  // Stop capture, flush both streams, patch WAV headers, write session metadata, trigger transcription
  ipcMain.handle('audist:recording:stop', async (event, duration: number): Promise<void> => {
    if (!session) return

    acceptingChunks = false
    const s = session
    session = null

    // Close both write streams and wait for drain
    const streamClosures = [
      new Promise<void>((resolve, reject) => s.micStream.end((err) => (err ? reject(err) : resolve())))
    ]
    if (s.systemStream) {
      streamClosures.push(
        new Promise<void>((resolve, reject) =>
          s.systemStream?.end((err) => (err ? reject(err) : resolve()))
        )
      )
    }
    await Promise.all(streamClosures)

    // Write session metadata — status starts as 'transcribing'; transcription pipeline updates it
    const meta = {
      duration,
      status: 'transcribing',
      micBytesWritten: s.micBytesWritten,
      systemBytesWritten: s.systemBytesWritten
    }
    writeFileSync(join(s.sessionDir, 'session.json'), JSON.stringify(meta), 'utf-8')

    const win = BrowserWindow.fromWebContents(event.sender)

    // Mix mic + system audio, then trigger transcription (fire-and-forget)
    mixAudio(s.sessionDir)
      .then(() => {
        if (win) win.webContents.send('audist:recording:saved', { sessionDir: s.sessionDir })
        if (win) transcribeSession(s.sessionDir, win)
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Audio mix failed'
        writeFileSync(
          join(s.sessionDir, 'session.json'),
          JSON.stringify({
            duration,
            status: 'error',
            error: message,
            micBytesWritten: s.micBytesWritten,
            systemBytesWritten: s.systemBytesWritten
          }),
          'utf-8'
        )
        if (win) {
          win.webContents.send('audist:transcription:error', {
            sessionId: basename(s.sessionDir),
            code: 'MIX_FAILED',
            message
          })
        }
      })
  })
}
