#!/usr/bin/env node
/**
 * scripts/generate-icons.mjs
 *
 * Generates the macOS icon set from the Audist waveform SVG:
 *   - build/icon.icns          (all sizes; macOS applies squircle from .app bundle)
 *   - resources/icon.png       (1024×1024; used by electron-builder for Windows/Linux)
 *   - resources/iconset/        (all 10 sizes; loaded as NativeImage for dev dock)
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
//
// Best practice on macOS is to keep the artwork inside a safe area instead of
// running the background all the way to the edge. Full-bleed artwork tends to
// read oversized in Finder and the Dock relative to native apps and polished
// third-party apps such as Beekeeper Studio.
//
// The 1024 canvas below uses:
//   - 92 px inset on all sides (840 px live area, ~82% of the canvas)
//   - matching rounded-rect radius scaled from the previous full-bleed icon
//   - waveform bars scaled and centered inside the live area
// ---------------------------------------------------------------------------
const CANVAS_SIZE = 1024
const LIVE_AREA_SIZE = 840
const LIVE_AREA_INSET = Math.round((CANVAS_SIZE - LIVE_AREA_SIZE) / 2)
const LIVE_AREA_SCALE = LIVE_AREA_SIZE / CANVAS_SIZE
const BACKGROUND_RADIUS = Math.round(229 * LIVE_AREA_SCALE)

const WAVEFORM_RECTS = [
  { x: 205, y: 444, width: 68, height: 137 },
  { x: 342, y: 308, width: 68, height: 409 },
  { x: 478, y: 239, width: 68, height: 546 },
  { x: 615, y: 376, width: 68, height: 273 },
  { x: 751, y: 478, width: 68, height: 68 },
]

const scaledWaveformRects = WAVEFORM_RECTS.map(({ x, y, width, height }) => ({
  x: LIVE_AREA_INSET + x * LIVE_AREA_SCALE,
  y: LIVE_AREA_INSET + y * LIVE_AREA_SCALE,
  width: width * LIVE_AREA_SCALE,
  height: height * LIVE_AREA_SCALE,
  rx: (width / 2) * LIVE_AREA_SCALE,
}))

const waveformSvg = scaledWaveformRects
  .map(
    ({ x, y, width, height, rx }) =>
      `  <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${rx}" fill="#7c5cfc"/>`
  )
  .join('\n')

const ICON_SVG = `\
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}" width="${CANVAS_SIZE}" height="${CANVAS_SIZE}">
  <rect x="${LIVE_AREA_INSET}" y="${LIVE_AREA_INSET}" width="${LIVE_AREA_SIZE}" height="${LIVE_AREA_SIZE}" rx="${BACKGROUND_RADIUS}" fill="#0d0e14"/>
${waveformSvg}
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
const tmpTiff = '/tmp/audist-icon.tiff'
const outIcns = join(root, 'build/icon.icns')
const outBuildPng = join(root, 'build/icon.png')
const outPng = join(root, 'resources/icon.png')
const outIconset = join(root, 'resources/iconset')

writeFileSync(tmpSvg, ICON_SVG)
console.log('Wrote master SVG')

if (existsSync(tmpIconset)) rmSync(tmpIconset, { recursive: true })
mkdirSync(tmpIconset)

for (const [, px, filename] of ICONSET_ENTRIES) {
  const out = join(tmpIconset, filename)
  execSync(
    `magick -background none -density 1024 ${tmpSvg} -resize ${px}x${px} -colorspace sRGB -define png:color-type=6 ${out}`
  )
  console.log(`  ${filename}  (${px}×${px}px)`)
}

const icnsSourceFiles = [
  'icon_16x16.png',
  'icon_32x32.png',
  'icon_128x128.png',
  'icon_256x256.png',
  'icon_512x512.png',
  'icon_512x512@2x.png',
]
  .map((filename) => join(tmpIconset, filename))
  .join(' ')

execSync(`magick ${icnsSourceFiles} ${tmpTiff}`)
execSync(`tiff2icns ${tmpTiff} ${outIcns}`)
console.log(`Generated ${outIcns}`)

copyFileSync(join(tmpIconset, 'icon_512x512@2x.png'), outPng)
console.log(`Updated ${outPng}`)

copyFileSync(join(tmpIconset, 'icon_512x512.png'), outBuildPng)
console.log(`Updated ${outBuildPng}`)

// Copy full iconset to resources/iconset/ so main process can build a
// multi-representation NativeImage for app.dock.setIcon() in dev mode.
if (existsSync(outIconset)) rmSync(outIconset, { recursive: true })
mkdirSync(outIconset, { recursive: true })
for (const [, , filename] of ICONSET_ENTRIES) {
  copyFileSync(join(tmpIconset, filename), join(outIconset, filename))
}
console.log(`Updated ${outIconset}/`)
