import { existsSync, readFileSync } from 'fs'
import { basename, join } from 'path'
import { getDefaultTemplateId, getTemplate } from './store'
import { DEFAULT_BUILTIN_TEMPLATE_ID } from './builtins'
import type { PromptTemplate } from './types'

export interface TemplateVars {
  transcript: string
  date: string
  duration: string
  participants: string // empty string if unavailable
  meeting_title: string // empty string if unavailable
}

export interface LLMMessage {
  role: 'system' | 'user'
  content: string
}

/** Replaces all supported `{{var}}` placeholders in `text` with values from `vars`. */
export function interpolateVars(text: string, vars: TemplateVars): string {
  return text
    .replace(/\{\{transcript\}\}/g, vars.transcript)
    .replace(/\{\{date\}\}/g, vars.date)
    .replace(/\{\{duration\}\}/g, vars.duration)
    .replace(/\{\{participants\}\}/g, vars.participants)
    .replace(/\{\{meeting_title\}\}/g, vars.meeting_title)
}

/** Builds the system + user LLM messages for a template, interpolating vars and ordering sections. */
export function buildPromptFromTemplate(
  template: PromptTemplate,
  vars: TemplateVars
): LLMMessage[] {
  const systemPrompt = interpolateVars(template.systemPrompt, vars)

  const sectionInstructions = [...template.outputSections]
    .sort((a, b) => a.order - b.order)
    .map((s) => `## ${s.heading}\n${s.instruction}`)
    .join('\n\n')

  const userPrompt = interpolateVars(
    `Summarise the following meeting transcript.\n\n` +
      `<transcript>\n{{transcript}}\n</transcript>\n\n` +
      `**Date:** {{date}}\n\n` +
      `Use this exact structure:\n\n# Meeting Summary\n\n${sectionInstructions}`,
    vars
  )

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ]
}

/** Formats a duration in seconds as e.g. "4m 32s" for use in {{duration}}. */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return ''
  const mins = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
}

/** Session directories are named `YYYY-MM-DD_HH-MM-SS` — extracts the date portion. */
export function dateFromSessionId(sessionId: string): string {
  return sessionId.split('_')[0] ?? sessionId
}

/**
 * Resolves which template to use for a session: the per-session override
 * (`sessionMeta.templateId`, set via AUD-66) if present, otherwise the
 * globally active template, falling back to the built-in default.
 */
export function resolveTemplateForSession(sessionDir: string): PromptTemplate {
  let templateId: string | undefined
  try {
    const metaPath = join(sessionDir, 'session.json')
    if (existsSync(metaPath)) {
      const meta = JSON.parse(readFileSync(metaPath, 'utf-8')) as Record<string, unknown>
      if (typeof meta.templateId === 'string' && meta.templateId) {
        templateId = meta.templateId
      }
    }
  } catch {
    // Non-critical — fall through to the active/default template
  }

  const resolvedId = templateId ?? getDefaultTemplateId()
  return (
    getTemplate(resolvedId) ??
    getTemplate(DEFAULT_BUILTIN_TEMPLATE_ID) ??
    (() => {
      throw new Error('No template found, including built-in default')
    })()
  )
}

/** Builds TemplateVars for a real session by reading its transcript.txt and session.json. */
export function buildVarsFromSession(sessionDir: string): TemplateVars {
  const sessionId = basename(sessionDir)
  const transcriptPath = join(sessionDir, 'transcript.txt')
  const transcript = existsSync(transcriptPath) ? readFileSync(transcriptPath, 'utf-8') : ''

  let duration = ''
  let meetingTitle = ''
  try {
    const metaPath = join(sessionDir, 'session.json')
    if (existsSync(metaPath)) {
      const meta = JSON.parse(readFileSync(metaPath, 'utf-8')) as Record<string, unknown>
      if (typeof meta.duration === 'number') duration = formatDuration(meta.duration)
      if (typeof meta.title === 'string') meetingTitle = meta.title
    }
  } catch {
    // Non-critical — leave duration/meeting_title empty
  }

  return {
    transcript,
    date: dateFromSessionId(sessionId),
    duration,
    participants: '',
    meeting_title: meetingTitle
  }
}
