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
