import { BrowserWindow, shell } from 'electron'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { writeFile } from 'fs/promises'
import { join, basename } from 'path'
import { llmRegistry } from '../llm/registry'
import { getLLMSettings } from '../store'
import type { ProviderName } from '../llm/types'

// ─────────────────────────────────────────────────────────────────────────────
// Default prompts
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_SYSTEM_PROMPT =
  'You are an expert meeting assistant. Your job is to produce a concise, structured summary of the meeting transcript provided. Always respond in valid Markdown. Do not include any preamble or explanation — output only the summary document.'

export const DEFAULT_USER_TEMPLATE = `Please summarise the following meeting transcript:

<transcript>
{{transcript}}
</transcript>

Use this exact structure:

# Meeting Summary
**Date:** {{date}}

## Key Points
(bullet list of the most important discussion points)

## Action Items
(checkbox list — [ ] Owner: description)

## Decisions Made
(bullet list of decisions reached)

## Open Questions
(bullet list of unresolved questions)`

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function updateSessionStatus(sessionDir: string, status: string): void {
  const metaPath = join(sessionDir, 'session.json')
  try {
    const existing = existsSync(metaPath)
      ? (JSON.parse(readFileSync(metaPath, 'utf-8')) as Record<string, unknown>)
      : {}
    writeFileSync(metaPath, JSON.stringify({ ...existing, status }), 'utf-8')
  } catch {
    // Non-critical
  }
}

function buildPrompt(template: string, transcript: string, date: string): string {
  return template.replace('{{transcript}}', transcript).replace('{{date}}', date)
}

// ─────────────────────────────────────────────────────────────────────────────
// Core pipeline
// ─────────────────────────────────────────────────────────────────────────────

export async function summariseSession(sessionDir: string, win: BrowserWindow): Promise<void> {
  const sessionId = basename(sessionDir)
  const settings = getLLMSettings()

  // Respect the summarisationEnabled flag (default: true)
  if (settings.summarisationEnabled === false) return

  const provider = llmRegistry.getActive()
  if (!provider) {
    win.webContents.send('audist:summary:error', {
      sessionId,
      code: 'NO_PROVIDER',
      message: 'No LLM provider configured. Set one up in Preferences.'
    })
    return
  }

  const transcriptPath = join(sessionDir, 'transcript.txt')
  if (!existsSync(transcriptPath)) {
    win.webContents.send('audist:summary:error', {
      sessionId,
      code: 'NO_TRANSCRIPT',
      message: 'transcript.txt not found in session directory.'
    })
    return
  }

  const transcript = readFileSync(transcriptPath, 'utf-8')
  const date = new Date().toISOString().split('T')[0]
  const userPrompt = buildPrompt(DEFAULT_USER_TEMPLATE, transcript, date)

  const activeProvider = (settings.activeProvider ?? provider.name) as ProviderName
  const model =
    settings.models?.[activeProvider] ??
    provider.availableModels[0] ??
    'gpt-4o-mini'

  updateSessionStatus(sessionDir, 'summarising')
  if (!win.isDestroyed()) {
    win.webContents.send('audist:summary:progress', { sessionId, status: 'started' })
  }

  try {
    const response = await provider.complete(
      [
        { role: 'system', content: DEFAULT_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      { model }
    )

    const summaryPath = join(sessionDir, 'summary.md')
    await writeFile(summaryPath, response, 'utf-8')

    updateSessionStatus(sessionDir, 'complete')
    if (!win.isDestroyed()) {
      win.webContents.send('audist:summary:complete', { sessionId, filePath: summaryPath })
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Summarisation failed'
    // Transcription succeeded — fall back to 'complete' so the session isn't stuck
    updateSessionStatus(sessionDir, 'complete')
    if (!win.isDestroyed()) {
      win.webContents.send('audist:summary:error', { sessionId, code: 'LLM_ERROR', message })
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// IPC handlers (summary read + open in Finder)
// ─────────────────────────────────────────────────────────────────────────────

import { ipcMain } from 'electron'

export function registerSummaryHandlers(): void {
  // Return summary.md content (or null if not yet written)
  ipcMain.handle('audist:summary:read', (_, { sessionDir }: { sessionDir: string }): string | null => {
    const summaryPath = join(sessionDir, 'summary.md')
    if (!existsSync(summaryPath)) return null
    try {
      return readFileSync(summaryPath, 'utf-8')
    } catch {
      return null
    }
  })

  // Open the session directory in Finder / Explorer
  ipcMain.handle('audist:session:openInFinder', (_, { sessionDir }: { sessionDir: string }): void => {
    void shell.openPath(sessionDir)
  })
}
