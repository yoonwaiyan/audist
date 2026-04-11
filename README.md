<p align="center">
  <img src="assets/logo.svg" alt="Audist"/>
</p>

> **This project is under early development. APIs, features, and file formats may change without notice.**

Audist is a macOS desktop app that records meetings and transcribes them locally using [whisper.cpp](https://github.com/ggerganov/whisper.cpp). No audio or transcripts leave your machine.

## Features

- Records microphone and system audio simultaneously
- Transcribes recordings locally using whisper.cpp (base.en model)
- Summarises transcripts via OpenAI, Anthropic, or any OpenAI-compatible provider (e.g. Ollama)
- Rename, browse, and keyboard-navigate past sessions
- Onboarding wizard guides first-time setup
- Preferences window for save directory, LLM provider, and model selection

## Tech stack

- [Electron](https://www.electronjs.org/) + [React 19](https://react.dev/) + TypeScript
- [Vite](https://vitejs.dev/) via [electron-vite](https://electron-vite.org/)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [whisper.cpp](https://github.com/ggerganov/whisper.cpp) via [@remotion/install-whisper-cpp](https://www.remotion.dev/docs/install-whisper-cpp)
- [ffmpeg-static](https://github.com/eugeneware/ffmpeg-static) for audio mixing

## Platform support

Audist currently runs on **macOS**. Windows and Linux support is on the roadmap — contributors are needed to help make it happen. If you're interested, check out [CONTRIBUTING.md](./CONTRIBUTING.md) to get started.

**Testers on all platforms are welcome.** If you run into any issues, please [file a GitHub issue](https://github.com/yoonwaiyan/audist/issues) with your platform details and steps to reproduce.

## Downloading on macOS

> **Note:** Releases are currently unsigned and unnotarized — this is a temporary measure during the early phase of the project. Once the app gains enough traction, we plan to invest in proper Apple code signing so this step goes away entirely.

macOS may show **"audist is damaged and can't be opened"** when you first open the downloaded DMG. This is a Gatekeeper restriction on apps that aren't notarized with Apple, not an actual problem with the file.

**To open it:**

1. Open **Terminal** and run:
   ```bash
   xattr -d com.apple.quarantine ~/Downloads/audist-*.dmg
   ```
2. Open the DMG normally and drag Audist to your Applications folder.

Alternatively, after the blocked attempt, go to **System Settings → Privacy & Security** and click **Open Anyway**.

## Requirements

- macOS (primary platform — Windows/Linux support is planned)
- Node.js (see `.tool-versions` for the exact version)
- Xcode Command Line Tools (for building whisper.cpp in development)

## Getting started

```bash
npm install
npm run dev
```

On first launch, Audist will guide you through a setup wizard to configure microphone/screen permissions and download the whisper.cpp base model (~140 MB). This only happens once.

## Building for release

```bash
# Compile the whisper.cpp binary for the current platform (run once before packaging)
npm run prepare:whisper

# Build and package for macOS
npm run build:mac
```

## Testing

```bash
# Run e2e tests (Playwright + Electron)
npm run test:e2e
```

## License

Audist is open source software licensed under the [GNU General Public License v3](./LICENSE). See [LICENSE.md](./LICENSE.md) for details.
