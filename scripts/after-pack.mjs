// Chromium's SUID sandbox requires chrome-sandbox to be root-owned with mode
// 4755. AppImage extraction never preserves that, so if the binary is present
// but misconfigured, Chromium aborts on startup instead of falling back.
// Removing it makes Chromium treat the sandbox binary as absent and skip
// SUID sandboxing entirely (paired with the --no-sandbox switch in main/index.ts).
import { rm } from 'node:fs/promises'
import { join } from 'node:path'

export default async function afterPack(context) {
  if (context.electronPlatformName !== 'linux') return

  const sandboxPath = join(context.appOutDir, 'chrome-sandbox')
  await rm(sandboxPath, { force: true })
}
