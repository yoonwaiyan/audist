import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { launchApp, launchAppWithSaveDir } from './helpers/electron'

function makeSaveDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'audist-saves-'))
}

test.describe('Recording UI — idle state', () => {
  test('shows Start Recording button on main page', async () => {
    const { app, page, cleanup } = await launchAppWithSaveDir()

    await expect(page.getByRole('button', { name: 'Start Recording' })).toBeVisible()

    await app.close()
    cleanup()
  })

  test('does not show Stop Recording or Stopping buttons when idle', async () => {
    const { app, page, cleanup } = await launchAppWithSaveDir()

    await expect(page.getByRole('button', { name: 'Stop Recording' })).not.toBeVisible()
    await expect(page.getByRole('button', { name: 'Stopping…' })).not.toBeVisible()

    await app.close()
    cleanup()
  })

  test('elapsed timer and waveform are not shown when idle', async () => {
    const { app, page, cleanup } = await launchAppWithSaveDir()

    // Pulsing dot and timer only appear during recording
    await expect(page.locator('.animate-pulse')).not.toBeVisible()
    await expect(page.locator('.tabular-nums.font-mono')).not.toBeVisible()

    await app.close()
    cleanup()
  })

  test('shows empty session list message when no sessions exist', async () => {
    const { app, page, cleanup } = await launchAppWithSaveDir()

    await expect(page.getByText('No recordings yet')).toBeVisible()

    await app.close()
    cleanup()
  })
})

test.describe('Whisper bootstrap gate', () => {
  test('redirects to whisper setup page when whisper is not installed', async () => {
    const saveDir = makeSaveDir()
    const { app, page, cleanup } = await launchApp({
      saveDirectory: saveDir,
      permissions: 'granted',
      whisper: 'not-ready'
    })

    await expect(
      page.getByRole('heading', { name: 'Setting up Audist' })
    ).toBeVisible()

    await app.close()
    cleanup()
    fs.rmSync(saveDir, { recursive: true, force: true })
  })

  test('whisper setup screen is non-dismissable (no skip or cancel)', async () => {
    const saveDir = makeSaveDir()
    const { app, page, cleanup } = await launchApp({
      saveDirectory: saveDir,
      permissions: 'granted',
      whisper: 'not-ready'
    })

    await expect(
      page.getByRole('heading', { name: 'Setting up Audist' })
    ).toBeVisible()
    await expect(page.getByRole('button', { name: /skip/i })).not.toBeVisible()
    await expect(page.getByRole('button', { name: /cancel/i })).not.toBeVisible()
    await expect(page.getByRole('link', { name: /skip/i })).not.toBeVisible()

    await app.close()
    cleanup()
    fs.rmSync(saveDir, { recursive: true, force: true })
  })

  test('whisper setup page shows progress bar', async () => {
    const saveDir = makeSaveDir()
    const { app, page, cleanup } = await launchApp({
      saveDirectory: saveDir,
      permissions: 'granted',
      whisper: 'not-ready'
    })

    await expect(
      page.getByRole('heading', { name: 'Setting up Audist' })
    ).toBeVisible()
    // Progress bar container is present
    await expect(page.locator('.rounded-full').first()).toBeVisible()

    await app.close()
    cleanup()
    fs.rmSync(saveDir, { recursive: true, force: true })
  })

  test('main UI is shown when whisper is already installed', async () => {
    const { app, page, cleanup } = await launchAppWithSaveDir() // defaults to whisper: 'ready'

    await expect(page.getByRole('button', { name: 'Start Recording' })).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Setting up transcription engine…' })
    ).not.toBeVisible()

    await app.close()
    cleanup()
  })
})
