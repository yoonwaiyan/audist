import { test, expect } from '@playwright/test'
import os from 'os'
import fs from 'fs'
import path from 'path'
import { launchApp } from './helpers/electron'

function makeSaveDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'audist-saves-'))
}

test.describe('Whisper Setup Page', () => {
  test('redirects to whisper setup page when whisper is not ready', async () => {
    const saveDir = makeSaveDir()
    const { app, page, cleanup } = await launchApp({
      saveDirectory: saveDir,
      permissions: 'granted',
      whisper: 'not-ready'
    })

    await expect(page.getByRole('heading', { name: 'Setting up Audist' })).toBeVisible()

    await app.close()
    cleanup()
    fs.rmSync(saveDir, { recursive: true, force: true })
  })

  test('shows heading and subtext', async () => {
    const saveDir = makeSaveDir()
    const { app, page, cleanup } = await launchApp({
      saveDirectory: saveDir,
      permissions: 'granted',
      whisper: 'not-ready'
    })

    await expect(page.getByRole('heading', { name: 'Setting up Audist' })).toBeVisible()
    await expect(
      page.getByText('Downloading required components for transcription')
    ).toBeVisible()

    await app.close()
    cleanup()
    fs.rmSync(saveDir, { recursive: true, force: true })
  })

  test('shows both download rows', async () => {
    const saveDir = makeSaveDir()
    const { app, page, cleanup } = await launchApp({
      saveDirectory: saveDir,
      permissions: 'granted',
      whisper: 'not-ready'
    })

    await expect(page.getByRole('heading', { name: 'Setting up Audist' })).toBeVisible()
    await expect(page.getByText('Downloading Whisper engine')).toBeVisible()
    await expect(page.getByText('Downloading speech model (base.en)')).toBeVisible()

    await app.close()
    cleanup()
    fs.rmSync(saveDir, { recursive: true, force: true })
  })

  test('shows progress bar while engine is downloading', async () => {
    const saveDir = makeSaveDir()
    const { app, page, cleanup } = await launchApp({
      saveDirectory: saveDir,
      permissions: 'granted',
      whisper: 'not-ready'
    })

    await expect(page.getByRole('heading', { name: 'Setting up Audist' })).toBeVisible()
    // The mock fires 'installing' events — engine row shows a progress bar
    await expect(page.locator('.bg-accent.rounded-full').first()).toBeVisible({ timeout: 3000 })

    await app.close()
    cleanup()
    fs.rmSync(saveDir, { recursive: true, force: true })
  })

  test('shows progress bar while model is downloading', async () => {
    const saveDir = makeSaveDir()
    const { app, page, cleanup } = await launchApp({
      saveDirectory: saveDir,
      permissions: 'granted',
      whisper: 'not-ready'
    })

    await expect(page.getByRole('heading', { name: 'Setting up Audist' })).toBeVisible()
    // Engine finishes first (~450ms), then model starts downloading
    // Wait for the percentage text which only appears during downloading
    await expect(page.getByText('0%').or(page.getByText('50%'))).toBeVisible({ timeout: 3000 })

    await app.close()
    cleanup()
    fs.rmSync(saveDir, { recursive: true, force: true })
  })

  test('shows "Setup Complete" heading when both downloads finish', async () => {
    const saveDir = makeSaveDir()
    const { app, page, cleanup } = await launchApp({
      saveDirectory: saveDir,
      permissions: 'granted',
      whisper: 'not-ready'
    })

    await expect(page.getByRole('heading', { name: 'Setting up Audist' })).toBeVisible()
    // Mock install takes ~850ms total; heading flips to Setup Complete before navigation
    await expect(page.getByRole('heading', { name: 'Setup Complete' })).toBeVisible({
      timeout: 5000
    })

    await app.close()
    cleanup()
    fs.rmSync(saveDir, { recursive: true, force: true })
  })

  test('auto-navigates to main UI after both downloads complete', async () => {
    const saveDir = makeSaveDir()
    const { app, page, cleanup } = await launchApp({
      saveDirectory: saveDir,
      permissions: 'granted',
      whisper: 'not-ready'
    })

    await expect(page.getByRole('heading', { name: 'Setting up Audist' })).toBeVisible()
    // After mock install + 500ms navigate delay, lands on main UI (sidebar shows "audist" logo)
    await expect(page.getByRole('complementary').getByText('audist')).toBeVisible({
      timeout: 5000
    })

    await app.close()
    cleanup()
    fs.rmSync(saveDir, { recursive: true, force: true })
  })

  test('skips whisper setup page when whisper is already ready', async () => {
    const saveDir = makeSaveDir()
    const { app, page, cleanup } = await launchApp({
      saveDirectory: saveDir,
      permissions: 'granted',
      whisper: 'ready'
    })

    // Should land on main UI directly
    await expect(page.getByRole('complementary').getByText('audist')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Setting up Audist' })).not.toBeVisible()

    await app.close()
    cleanup()
    fs.rmSync(saveDir, { recursive: true, force: true })
  })
})
