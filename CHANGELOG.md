# Changelog

All notable changes to Audist are documented here.

## [Unreleased]

### Fixed

- **Platform-aware shortcut hints** — Tooltip and `<kbd>` labels in the renderer hardcoded `⌘`/`⇧` glyphs, showing macOS shortcuts to Windows and Linux users. Hints now resolve at runtime: `⌘,` / `⌘⇧R` on macOS, `Ctrl+,` / `Ctrl+Shift+R` on Windows/Linux. A new `formatShortcut` helper in `src/renderer/src/lib/shortcuts.ts` and a `SHORTCUTS` registry serve as the single source of truth, keeping the door open for user-customisable bindings later.

## [1.3.0] - 2026-04-20

### Added

- **UI redesign** — Main window, session list, and session detail rebuilt with a Linear-inspired visual style. New design tokens, CSS animations, and a dark/violet theme replace the previous layout. (#AUD-102)
- **Redesigned recording screen** — New visual style for the recording page with separate mic and system audio level meters driven by real analyser RMS. Session rename on stop is now inline on the recording screen. (#AUD-102)
- **In-progress pipeline labels** — Transcribing and summarising states now show descriptive labels in the session list instead of a generic spinner. (#AUD-102)
- **Whisper model name in UI** — The active Whisper model name is fetched via IPC and displayed dynamically in the Whisper setup screen. (#AUD-102)

### Fixed

- **Mic capture silent on macOS** — `AudioContext` created for the level-meter analyser was starting in `suspended` state when instantiated deep in an async chain past the user-gesture boundary. The analyser's audio graph never ran, leaving both mic and system meters silent. `audioContext.resume()` is now explicitly awaited before the stream source is connected, matching the fix already applied to the worklet path in 1.1.4. (#AUD-102)
- **Mic MediaRecorder empty blobs** — Explicitly disabling `echoCancellation`, `noiseSuppression`, and `autoGainControl` routes Chromium on macOS through a different audio-processing path that causes `MediaRecorder` to produce empty data events. Mic capture now requests `audio: true` with no explicit constraints. (#AUD-102)
- **Double-click recording bug** — A `starting` transitional state now blocks a second record invocation while the first is still initialising. (#AUD-102)
- **Session detail navigation** — Back button and action buttons restored in the session detail nav bar after the redesign removed them. (#AUD-102)

### Changed

- **LLM provider selector** — Provider picker in preferences replaced with a segmented pill control. (#AUD-102)
- **Preferences window** — Title centred in the preferences window titlebar; Prompt section removed from navigation. (#AUD-102)
- **Recording pipeline cleanup** — Removed WAV-era leftovers following the switch to `MediaRecorder`/webm capture: `micSampleRate`/`systemSampleRate` fields dropped from session state and IPC payload; the temporary `AudioContext` opened only to read the native sample rate is gone; `mix.ts` simplified from a multi-format fallback to webm-only; stale `mic.wav` fallback removed from the transcription path. (#AUD-102)

## [1.2.0] - 2026-04-15

### Added

- **About Audist** — Added an About menu item that displays the installed app version from Electron, along with runtime version details. (#AUD-92)

## [1.1.6] - 2026-04-15

### Fixed

- **Transcription in packaged app** — Whisper was silently producing a full transcript but failing to save it because `@remotion/install-whisper-cpp` writes its temporary JSON output to `path.join(process.cwd(), 'tmp.json')`, and in a packaged Electron app `process.cwd()` returns `/`, making the target `/tmp.json` (root filesystem, not writable). The working directory is now temporarily switched to `userData` before invoking whisper and restored afterwards. (#40)
- **Stuck "Generating summary…" after app quit** — If the app was quit or crashed while transcribing or summarising, `session.json` retained the in-progress status. On next launch the session showed a permanent spinner with all retry buttons disabled (`isProcessing = true`). A startup cleanup pass now resets any stale `transcribing` / `summarising` status to `error` so the session is retryable. (#40)
- **CPU overload on transcription retry** — Each retry spawned a new whisper process without cancelling the previous one. On a long recording this stacked multiple CPU-intensive whisper instances. Retrying a session now aborts the previous whisper process via `AbortController` before starting a fresh one. (#40)

## [1.1.5] - 2026-04-11

### Fixed

- **macOS release pipeline** — ImageMagick is now installed in the release workflow before icon generation, fixing `magick: command not found` failures on the GitHub Actions macOS runner. (#33)

## [1.1.4] - 2026-04-11

### Fixed

- **Error reporting UI** — Raw error messages are no longer dumped inline in the session detail view. Transcription and summary failures now show a concise "Error transcribing" / "Error summarizing" label with a **Try again** button and a **Copy error log** button for accessing the full log. Errors are also correctly restored on session reload, and live transcription errors (previously silently dropped) are now captured. (#29)
- **Transcription error visibility** — Transcription errors are now shown on the Summary tab (the default view) so failures are immediately visible without switching tabs. (#29)
- **Waveform visualizer** — System audio is now connected to the waveform analyser during recording, so audio playing from other apps animates the waveform alongside microphone input. (#30)
- **App icon** — The Audist waveform logo now appears in the macOS dock and app bundle instead of the default Electron icon. (#31)
- **iCloud eviction** — Whisper binary and model files are now marked with `com.apple.icloud.donotpresent` on first run, preventing macOS iCloud Drive's "Optimize Mac Storage" from evicting the ~142 MB files after periods of inactivity. (#28)

## [1.1.0] - 2026-03-21

### Added

- macOS release build pipeline — GitHub Actions workflow that builds and publishes a `.dmg` on version tags. (#27)
- No-summary placeholder and **Generate Summary** button in the session detail view. (#25)
- **Regenerate summary** button with a "Generated by: Provider · Model" badge when a summary exists. (#25)

### Fixed

- LLM provider switching no longer loses the previously selected model for each provider. Clearing an API key now also removes that provider from the recording screen selector. (#26)

## [1.0.0] - 2026-03-20

### Added

- Onboarding wizard (permissions → save directory → LLM setup). (#24)
- Permission failure screen with actionable "Open System Settings" CTA. (#24)
- Whisper download screen with per-file progress rows. (#23)
- Session renaming — click the title in the detail header to edit inline. (#22)
