import { BrowserWindow, shell } from 'electron'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { writeFile } from 'fs/promises'
import { join, basename } from 'path'
import { llmRegistry } from '../llm/registry'
import { getLLMSettings } from '../store'
import { LLMError } from '../llm/types'
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

function updateSessionStatus(
  sessionDir: string,
  status: string,
  errorMsg?: string,
  summaryErrorCode?: string
): void {
  const metaPath = join(sessionDir, 'session.json')
  try {
    const existing = existsSync(metaPath)
      ? (JSON.parse(readFileSync(metaPath, 'utf-8')) as Record<string, unknown>)
      : {}
    const update: Record<string, unknown> = { ...existing, status }
    if (errorMsg !== undefined) {
      update.error = errorMsg
    } else {
      delete update.error
    }
    if (summaryErrorCode !== undefined) {
      update.summaryErrorCode = summaryErrorCode
    } else {
      delete update.summaryErrorCode
    }
    writeFileSync(metaPath, JSON.stringify(update), 'utf-8')
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
    const message = 'No LLM provider configured. Add an API key in Settings.'
    updateSessionStatus(sessionDir, 'error', message, 'NO_PROVIDER')
    if (!win.isDestroyed()) {
      win.webContents.send('audist:summary:error', { sessionId, code: 'NO_PROVIDER', message })
    }
    return
  }

  const transcriptPath = join(sessionDir, 'transcript.txt')
  if (!existsSync(transcriptPath)) {
    const message = 'Transcript not found. Re-run transcription first.'
    updateSessionStatus(sessionDir, 'error', message, 'NO_TRANSCRIPT')
    if (!win.isDestroyed()) {
      win.webContents.send('audist:summary:error', { sessionId, code: 'NO_TRANSCRIPT', message })
    }
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

  let response: string
  try {
    response = await provider.complete(
      [
        { role: 'system', content: DEFAULT_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      { model }
    )
  } catch (err: unknown) {
    let code: string
    let message: string

    if (err instanceof LLMError) {
      code = err.code
      message = err.message
      // Enrich CONNECTION_ERROR for compatible provider with the configured base URL
      if (code === 'CONNECTION_ERROR' && provider.name === 'compatible') {
        const baseUrl = settings.compatibleBaseUrl ?? 'unknown'
        message = `Cannot reach local runtime at ${baseUrl}. Make sure Ollama/LM Studio is running.`
      }
    } else {
      code = 'API_ERROR'
      message = `Summarisation failed: ${err instanceof Error ? err.message : 'Unknown error'}`
    }

    updateSessionStatus(sessionDir, 'error', message, code)
    if (!win.isDestroyed()) {
      win.webContents.send('audist:summary:error', { sessionId, code, message })
    }
    return
  }

  const summaryPath = join(sessionDir, 'summary.md')
  try {
    await writeFile(summaryPath, response, 'utf-8')
  } catch (err: unknown) {
    const message = `Couldn't save summary.md. Check disk space and permissions.`
    updateSessionStatus(sessionDir, 'error', message, 'FILE_ERROR')
    if (!win.isDestroyed()) {
      win.webContents.send('audist:summary:error', { sessionId, code: 'FILE_ERROR', message })
    }
    return
  }

  updateSessionStatus(sessionDir, 'complete')
  if (!win.isDestroyed()) {
    win.webContents.send('audist:summary:complete', { sessionId, filePath: summaryPath })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// IPC handlers
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

  // Re-run the summarisation pipeline for a session
  ipcMain.handle('audist:summary:retry', async (event, { sessionDir }: { sessionDir: string }): Promise<void> => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return
    await summariseSession(sessionDir, win)
  })

  // Open the session directory in Finder / Explorer
  ipcMain.handle('audist:session:openInFinder', (_, { sessionDir }: { sessionDir: string }): void => {
    void shell.openPath(sessionDir)
  })
}
