#!/usr/bin/env node
/**
 * Compile whisper.cpp for the current platform/arch and copy the binary to
 * resources/whisper-bin/ so electron-builder can bundle it as an extraResource.
 *
 * Run before building a release:
 *   node scripts/prepare-whisper.mjs
 *
 * The output binary is git-ignored. Rebuild whenever WHISPER_VERSION changes.
 */

import { installWhisperCpp } from '@remotion/install-whisper-cpp'
import { existsSync, mkdirSync, copyFileSync, chmodSync, rmSync } from 'fs'
import { join } from 'path'
import os from 'os'

const WHISPER_VERSION = '1.5.5'

// Binary name for whisper.cpp v1.5.5 (v1.7.4+ uses 'whisper-cli')
const BIN_NAME = process.platform === 'win32' ? 'main.exe' : 'main'
const OUT_DIR = join(process.cwd(), 'resources', 'whisper-bin')
const OUT_BIN = join(OUT_DIR, BIN_NAME)

if (existsSync(OUT_BIN)) {
  console.log(`✓ whisper binary already present at ${OUT_BIN} — skipping compilation`)
  process.exit(0)
}

console.log(`Building whisper.cpp v${WHISPER_VERSION} for ${process.platform}/${process.arch}…`)
console.log('This may take several minutes on first run.\n')

// Compile into a temp dir, then copy just the binary
const tmpDir = join(os.tmpdir(), `whisper-build-${Date.now()}`)

try {
  // Suppress git credential prompts
  process.env['GIT_TERMINAL_PROMPT'] = '0'
  process.env['GIT_ASKPASS'] = 'echo'

  await installWhisperCpp({ version: WHISPER_VERSION, to: tmpDir, printOutput: true })

  mkdirSync(OUT_DIR, { recursive: true })
  copyFileSync(join(tmpDir, BIN_NAME), OUT_BIN)
  if (process.platform !== 'win32') chmodSync(OUT_BIN, 0o755)

  console.log(`\n✓ whisper binary written to ${OUT_BIN}`)
} finally {
  // Clean up build dir regardless of success/failure
  try { rmSync(tmpDir, { recursive: true, force: true }) } catch { /* ignore */ }
}
