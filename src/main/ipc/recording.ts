import { ipcMain, desktopCapturer } from 'electron'
import { createWriteStream, openSync, writeSync, closeSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { WriteStream } from 'fs'

// ─────────────────────────────────────────────────────────────────────────────
// WAV helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeWavHeader(sampleRate: number, numChannels: number): Buffer {
  const bitsPerSample = 16
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8
  const blockAlign = (numChannels * bitsPerSample) / 8
  const buf = Buffer.alloc(44)
  buf.write('RIFF', 0, 'ascii')
  buf.writeUInt32LE(0, 4) // placeholder: RIFF chunk size (fileSize - 8)
  buf.write('WAVE', 8, 'ascii')
  buf.write('fmt ', 12, 'ascii')
  buf.writeUInt32LE(16, 16) // PCM sub-chunk size
  buf.writeUInt16LE(1, 20) // PCM format
  buf.writeUInt16LE(numChannels, 22)
  buf.writeUInt32LE(sampleRate, 24)
  buf.writeUInt32LE(byteRate, 28)
  buf.writeUInt16LE(blockAlign, 32)
  buf.writeUInt16LE(bitsPerSample, 34)
  buf.write('data', 36, 'ascii')
  buf.writeUInt32LE(0, 40) // placeholder: data chunk size
  return buf
}

function patchWavHeader(filePath: string, bytesWritten: number): void {
  const fd = openSync(filePath, 'r+')
  try {
    const buf = Buffer.alloc(4)
    buf.writeUInt32LE(bytesWritten + 36)
    writeSync(fd, buf, 0, 4, 4) // RIFF chunk size
    buf.writeUInt32LE(bytesWritten)
    writeSync(fd, buf, 0, 4, 40) // data chunk size
  } finally {
    closeSync(fd)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Session state
// ─────────────────────────────────────────────────────────────────────────────

interface SessionState {
  sessionDir: string
  micPath: string
  systemPath: string
  micStream: WriteStream
  systemStream: WriteStream
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
    (_, payload: { sessionDir: string; micSampleRate: number; systemSampleRate: number }): void => {
      if (session) throw new Error('Recording already active')

      const { sessionDir, micSampleRate, systemSampleRate } = payload
      const micPath = join(sessionDir, 'mic.wav')
      const systemPath = join(sessionDir, 'system.wav')

      const micStream = createWriteStream(micPath)
      const systemStream = createWriteStream(systemPath)

      micStream.write(makeWavHeader(micSampleRate, 1))
      systemStream.write(makeWavHeader(systemSampleRate, 1))

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

  // One-way: renderer sends raw Int16 PCM chunks for mic audio
  ipcMain.on('audist:recording:mic-audio-chunk', (_, chunk: Buffer) => {
    if (!acceptingChunks || !session) return
    session.micBytesWritten += chunk.length
    session.micStream.write(chunk)
  })

  // One-way: renderer sends raw Int16 PCM chunks for system audio
  ipcMain.on('audist:recording:system-audio-chunk', (_, chunk: Buffer) => {
    if (!acceptingChunks || !session) return
    session.systemBytesWritten += chunk.length
    session.systemStream.write(chunk)
  })

  // Stop capture, flush both streams, patch WAV headers, and write session metadata
  ipcMain.handle('audist:recording:stop', async (_, duration: number): Promise<void> => {
    if (!session) return

    acceptingChunks = false
    const s = session
    session = null

    // Close both write streams and wait for drain
    await Promise.all([
      new Promise<void>((resolve, reject) => s.micStream.end((err) => (err ? reject(err) : resolve()))),
      new Promise<void>((resolve, reject) =>
        s.systemStream.end((err) => (err ? reject(err) : resolve()))
      )
    ])

    // Patch WAV headers with real sizes
    if (s.micBytesWritten > 0) patchWavHeader(s.micPath, s.micBytesWritten)
    if (s.systemBytesWritten > 0) patchWavHeader(s.systemPath, s.systemBytesWritten)

    // Write session metadata for session history
    const meta = { duration, status: 'complete' }
    writeFileSync(join(s.sessionDir, 'session.json'), JSON.stringify(meta), 'utf-8')
  })
}
