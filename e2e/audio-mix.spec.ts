import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { launchApp } from './helpers/electron'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a minimal silent mono WAV file (PCM zeros) at the given path.
 * ffmpeg detects file format by magic bytes, so writing WAV content to a
 * .webm path works fine as a test fixture.
 */
function createSilentAudio(filePath: string, sampleRate: number, durationSec: number): void {
  const dataBytes = sampleRate * durationSec * 2 // 16-bit mono
  const buf = Buffer.alloc(44 + dataBytes, 0)
  buf.write('RIFF', 0, 'ascii')
  buf.writeUInt32LE(36 + dataBytes, 4)
  buf.write('WAVE', 8, 'ascii')
  buf.write('fmt ', 12, 'ascii')
  buf.writeUInt32LE(16, 16)
  buf.writeUInt16LE(1, 20) // PCM
  buf.writeUInt16LE(1, 22) // mono
  buf.writeUInt32LE(sampleRate, 24)
  buf.writeUInt32LE(sampleRate * 2, 28)
  buf.writeUInt16LE(2, 32)
  buf.writeUInt16LE(16, 34)
  buf.write('data', 36, 'ascii')
  buf.writeUInt32LE(dataBytes, 40)
  fs.writeFileSync(filePath, buf)
}

async function invokeMix(page: import('@playwright/test').Page, sessionDir: string): Promise<void> {
  const error = await page.evaluate(
    async (dir) => {
      try {
        await window.electron.ipcRenderer.invoke('audist:test:mix-audio', dir)
        return null
      } catch (e) {
        return (e as Error).message
      }
    },
    sessionDir
  )
  if (error) throw new Error(error)
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Audio mix (AUD-11)', () => {
  test('produces audio.wav and audio.m4a from mic.webm + system.webm', async () => {
    const sessionDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audist-mix-'))
    const saveDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audist-saves-'))
    const { app, page, cleanup } = await launchApp({
      saveDirectory: saveDir,
      permissions: 'granted',
      whisper: 'ready',
      testMode: true
    })

    try {
      createSilentAudio(path.join(sessionDir, 'mic.webm'), 44100, 1)
      createSilentAudio(path.join(sessionDir, 'system.webm'), 44100, 1)

      await invokeMix(page, sessionDir)

      expect(fs.existsSync(path.join(sessionDir, 'audio.wav'))).toBe(true)
      expect(fs.existsSync(path.join(sessionDir, 'audio.m4a'))).toBe(true)
    } finally {
      await app.close()
      cleanup()
      fs.rmSync(sessionDir, { recursive: true, force: true })
      fs.rmSync(saveDir, { recursive: true, force: true })
    }
  })

  test('audio.wav is 16 kHz mono PCM', async () => {
    const sessionDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audist-mix-'))
    const saveDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audist-saves-'))
    const { app, page, cleanup } = await launchApp({
      saveDirectory: saveDir,
      permissions: 'granted',
      whisper: 'ready',
      testMode: true
    })

    try {
      createSilentAudio(path.join(sessionDir, 'mic.webm'), 44100, 1)
      createSilentAudio(path.join(sessionDir, 'system.webm'), 44100, 1)

      await invokeMix(page, sessionDir)

      const header = Buffer.alloc(44)
      const fd = fs.openSync(path.join(sessionDir, 'audio.wav'), 'r')
      fs.readSync(fd, header, 0, 44, 0)
      fs.closeSync(fd)

      expect(header.toString('ascii', 0, 4)).toBe('RIFF')
      expect(header.toString('ascii', 8, 12)).toBe('WAVE')
      const audioFormat = header.readUInt16LE(20)
      const channels = header.readUInt16LE(22)
      const sampleRate = header.readUInt32LE(24)
      expect(audioFormat).toBe(1) // PCM
      expect(channels).toBe(1)    // mono
      expect(sampleRate).toBe(16000) // 16 kHz
    } finally {
      await app.close()
      cleanup()
      fs.rmSync(sessionDir, { recursive: true, force: true })
      fs.rmSync(saveDir, { recursive: true, force: true })
    }
  })

  test('deletes mic.webm and system.webm after successful mix', async () => {
    const sessionDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audist-mix-'))
    const saveDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audist-saves-'))
    const { app, page, cleanup } = await launchApp({
      saveDirectory: saveDir,
      permissions: 'granted',
      whisper: 'ready',
      testMode: true
    })

    try {
      createSilentAudio(path.join(sessionDir, 'mic.webm'), 44100, 1)
      createSilentAudio(path.join(sessionDir, 'system.webm'), 44100, 1)

      await invokeMix(page, sessionDir)

      expect(fs.existsSync(path.join(sessionDir, 'mic.webm'))).toBe(false)
      expect(fs.existsSync(path.join(sessionDir, 'system.webm'))).toBe(false)
    } finally {
      await app.close()
      cleanup()
      fs.rmSync(sessionDir, { recursive: true, force: true })
      fs.rmSync(saveDir, { recursive: true, force: true })
    }
  })

  test('produces audio from mic-only capture when system.webm is absent', async () => {
    const sessionDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audist-mix-'))
    const saveDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audist-saves-'))
    const { app, page, cleanup } = await launchApp({
      saveDirectory: saveDir,
      permissions: 'granted',
      whisper: 'ready',
      testMode: true
    })

    try {
      // Only mic — system audio is optional (e.g. screen recording permission denied)
      createSilentAudio(path.join(sessionDir, 'mic.webm'), 44100, 1)

      await invokeMix(page, sessionDir)

      expect(fs.existsSync(path.join(sessionDir, 'audio.wav'))).toBe(true)
      expect(fs.existsSync(path.join(sessionDir, 'audio.m4a'))).toBe(true)
    } finally {
      await app.close()
      cleanup()
      fs.rmSync(sessionDir, { recursive: true, force: true })
      fs.rmSync(saveDir, { recursive: true, force: true })
    }
  })

  test('produces audio from system-only capture when mic.webm is absent', async () => {
    const sessionDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audist-mix-'))
    const saveDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audist-saves-'))
    const { app, page, cleanup } = await launchApp({
      saveDirectory: saveDir,
      permissions: 'granted',
      whisper: 'ready',
      testMode: true
    })

    try {
      // Only system audio — mic may have been silent/empty and was dropped
      createSilentAudio(path.join(sessionDir, 'system.webm'), 44100, 1)

      await invokeMix(page, sessionDir)

      expect(fs.existsSync(path.join(sessionDir, 'audio.wav'))).toBe(true)
      expect(fs.existsSync(path.join(sessionDir, 'audio.m4a'))).toBe(true)
    } finally {
      await app.close()
      cleanup()
      fs.rmSync(sessionDir, { recursive: true, force: true })
      fs.rmSync(saveDir, { recursive: true, force: true })
    }
  })

  test('throws when both mic.webm and system.webm are missing', async () => {
    const sessionDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audist-mix-'))
    const saveDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audist-saves-'))
    const { app, page, cleanup } = await launchApp({
      saveDirectory: saveDir,
      permissions: 'granted',
      whisper: 'ready',
      testMode: true
    })

    try {
      // No capture files at all
      const error = await page.evaluate(
        async (dir) => {
          try {
            await window.electron.ipcRenderer.invoke('audist:test:mix-audio', dir)
            return null
          } catch (e) {
            return (e as Error).message
          }
        },
        sessionDir
      )

      expect(error).toContain('No usable capture files found')
      expect(fs.existsSync(path.join(sessionDir, 'audio.wav'))).toBe(false)
      expect(fs.existsSync(path.join(sessionDir, 'audio.m4a'))).toBe(false)
    } finally {
      await app.close()
      cleanup()
      fs.rmSync(sessionDir, { recursive: true, force: true })
      fs.rmSync(saveDir, { recursive: true, force: true })
    }
  })
})
