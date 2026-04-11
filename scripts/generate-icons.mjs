#!/usr/bin/env node
/**
 * scripts/generate-icons.mjs
 *
 * Generates the macOS icon set from the Audist waveform SVG:
 *   - build/icon.icns          (all sizes; macOS applies squircle from .app bundle)
 *   - resources/icon.png       (1024×1024; used by electron-builder for Windows/Linux)
 *   - resources/icon-dock.png  (128×128 @1x; used by app.dock.setIcon in dev)
 *   - resources/icon-dock@2x.png (256×256 @2x; Electron auto-picks on Retina)
 *
 * Usage: node scripts/generate-icons.mjs
 * Requires: ImageMagick 7+ (magick), iconutil (macOS)
 */

import { execSync } from 'child_process'
import { mkdirSync, writeFileSync, rmSync, existsSync, copyFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

// ---------------------------------------------------------------------------
// Master icon SVG
// Derived from assets/logo.svg (5 bars, 24×24 viewBox, fill #7c5cfc).
// Scaled to 1024×1024 with bars centered at (512, 512):
//   scale factor ≈ 34.1 px/unit  →  bar width 68 px, center-to-center 136 px
//   heights (4,12,16,8,2 units)  →  137, 409, 546, 273, 68 px
// Full-bleed (no squircle) — macOS applies the squircle mask from the .icns.
// ---------------------------------------------------------------------------
const ICON_SVG = `\
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <rect width="1024" height="1024" fill="#0d0e14"/>
  <rect x="205" y="444" width="68" height="137" rx="34" fill="#7c5cfc"/>
  <rect x="342" y="308" width="68" height="409" rx="34" fill="#7c5cfc"/>
  <rect x="478" y="239" width="68" height="546" rx="34" fill="#7c5cfc"/>
  <rect x="615" y="376" width="68" height="273" rx="34" fill="#7c5cfc"/>
  <rect x="751" y="478" width="68" height="68"  rx="34" fill="#7c5cfc"/>
</svg>`

// ---------------------------------------------------------------------------
// macOS iconset entries: [logicalSize, physicalPixels, filename]
// iconutil requires these exact filenames.
// ---------------------------------------------------------------------------
const ICONSET_ENTRIES = [
  [16,  16,   'icon_16x16.png'],
  [16,  32,   'icon_16x16@2x.png'],
  [32,  32,   'icon_32x32.png'],
  [32,  64,   'icon_32x32@2x.png'],
  [128, 128,  'icon_128x128.png'],
  [128, 256,  'icon_128x128@2x.png'],
  [256, 256,  'icon_256x256.png'],
  [256, 512,  'icon_256x256@2x.png'],
  [512, 512,  'icon_512x512.png'],
  [512, 1024, 'icon_512x512@2x.png'],
]

const tmpSvg = '/tmp/audist-icon-master.svg'
const tmpIconset = '/tmp/audist-icon.iconset'
const outIcns = join(root, 'build/icon.icns')
const outPng = join(root, 'resources/icon.png')
const outDock1x = join(root, 'resources/icon-dock.png')
const outDock2x = join(root, 'resources/icon-dock@2x.png')

writeFileSync(tmpSvg, ICON_SVG)
console.log('Wrote master SVG')

if (existsSync(tmpIconset)) rmSync(tmpIconset, { recursive: true })
mkdirSync(tmpIconset)

for (const [, px, filename] of ICONSET_ENTRIES) {
  const out = join(tmpIconset, filename)
  execSync(`magick ${tmpSvg} -resize ${px}x${px} ${out}`)
  console.log(`  ${filename}  (${px}×${px}px)`)
}

execSync(`iconutil -c icns ${tmpIconset} -o ${outIcns}`)
console.log(`Generated ${outIcns}`)

copyFileSync(join(tmpIconset, 'icon_512x512@2x.png'), outPng)
console.log(`Updated ${outPng}`)

// Dock icon pair — Electron auto-picks @2x on Retina displays.
// 128pt logical size matches the standard macOS dock slot.
copyFileSync(join(tmpIconset, 'icon_128x128.png'), outDock1x)
copyFileSync(join(tmpIconset, 'icon_128x128@2x.png'), outDock2x)
console.log(`Updated ${outDock1x} + @2x`)
