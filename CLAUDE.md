# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev               # Start Electron app with hot reload
npm run start             # Preview production build (electron-vite preview)

# Building
npm run build             # Typecheck + electron-vite build
npm run build:mac         # Full macOS release build (whisper + vite + electron-builder)
npm run build:unpack      # Build without packaging (for quick inspection)

# Code quality
npm run typecheck         # Run both node and web typechecks
npm run lint              # ESLint with cache
npm run format            # Prettier

# Testing
npm run test:e2e          # Build then run all Playwright E2E tests
npx playwright test e2e/recording.spec.ts  # Run a single test file
npx playwright test --headed               # Run with visible browser/window
```

## Architecture

Audist is an Electron app (electron-vite scaffold) with **two BrowserWindows**:
- **mainWindow** (900×670) — the main recorder + session browser
- **prefsWindow** (640×520, lazy, hide-on-close) — settings window

### Process Structure

```
src/main/        Node.js (Electron main process)
src/preload/     Context-isolated IPC bridge → window.api
src/renderer/    React 19 + React Router v7 (hash routing — required for file://)
```

**Hash routing is mandatory** for Electron's `file://` protocol. All routes go through `createHashRouter` in `src/renderer/src/router.tsx`.

### Main Process

- **`src/main/index.ts`** — App entry: creates windows, registers all IPC handlers, bootstraps whisper
- **`src/main/menu.ts`** — Platform-aware app menu (`setApplicationMenu`); macOS gets an app-name menu, Win/Linux get a File menu. Preferences: `CmdOrCtrl+,`
- **`src/main/store.ts`** — Persists settings (`settings.json`) and encrypted credentials (`credentials.json`) via Electron `safeStorage`
- **`src/main/windows/prefs.ts`** — `focusOrOpenPrefsWindow(section?)` factory
- **`src/main/ipc/`** — One file per domain: `directory`, `permissions`, `recording`, `session`, `transcription`, `summary`, `mix`, `settings`
- **`src/main/llm/`** — LLM provider registry + implementations (OpenAI, Anthropic, OpenAI-compatible, Mock)
- **`src/main/whisper/bootstrap.ts`** — whisper.cpp setup on first run

### IPC Contract

The preload bridge (`window.api`) exposes these namespaces — full types in `src/preload/index.d.ts`:

| Namespace | Key channels |
|-----------|-------------|
| `directory` | `get`, `verify`, `select` |
| `session` | `create`, `list`, `rename`, `openInFinder` |
| `permissions` | `check`, `request-mic`, `open-settings` |
| `whisper` | `is-ready`, `install` |
| `recording` | `get-screen-source`, `start`, `stop`, `mic-audio-chunk`, `system-audio-chunk` |
| `transcription` | `read`, `retry` + progress/complete/error listeners |
| `summary` | `read`, `retry` + progress/complete/error listeners |
| `settings` | credential CRUD, provider/model selection, LLM settings |

Prefs-specific IPC (not on `window.api`):
- `audist:prefs:open` — renderer→main, opens/focuses prefs window with optional `{ section }`
- `audist:prefs:navigate` — main→prefs renderer, deep-links to a section

### Renderer Routing

```
/              → AppShell (loader: requireSetup — redirects to onboarding if not configured)
  index        → SessionListPage + SessionDetail
/onboarding    → Onboarding wizard (3 steps: permissions → save dir → LLM)
/permissions   → PermissionsPage
/whisper-setup → WhisperSetupPage
/prefs         → PrefsLayout
  general      → GeneralPrefsPage
  llm          → LLMPrefsPage
  prompt       → PromptPrefsPage
```

The `requireSetup()` root loader checks: save directory configured, permissions granted, whisper ready — redirects to the appropriate setup page if any check fails.

### Styling

Tailwind CSS v4 via `@tailwindcss/vite` plugin — **no `tailwind.config.js`**. Design tokens are CSS custom properties defined in `src/renderer/src/styles/tokens.css` and registered as Tailwind tokens via `@theme inline` in `src/renderer/src/assets/main.css`. Dark/violet theme. To add a new token, define it in `tokens.css` and map it in `main.css`.

**For all layout and styling implementation, refer to the Figma design files exported at `../audist-figma`** (sibling directory to this repo). When implementing UI changes, check that directory first for the reference designs before writing any layout or component styles.

### LLM Providers

`LLMRegistry` singleton (main process) manages providers. Fallback resolution order: openai → anthropic → compatible. The `MockLLMProvider` is registered in E2E test mode only. Providers implement `LLMProvider` from `src/main/llm/types.ts`.

### E2E Tests

Tests use Playwright + `electron` package to launch the real app. Key helper: `launchApp(opts)` in `e2e/helpers/electron.ts` — accepts overrides for `saveDirectory`, `permissions`, `whisper`, `llm`, `llmSettings`. Tests run serially (1 worker). Build is required before running (`pretest:e2e` runs `electron-vite build` automatically).

### External Binaries

- **whisper.cpp** — bundled under `resources/whisper-bin/` (unpacked from asar). `GGML_METAL_PATH_RESOURCES` must be set when spawning the whisper process in the packaged app so Metal GPU acceleration works (see AUD-94).
- **ffmpeg-static** — bundled under `node_modules/ffmpeg-static/` (unpacked from asar), used for audio mixing.

### Code Style

Prettier: single quotes, no semicolons, 100 char line width, no trailing commas.
