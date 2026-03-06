# Project Structure

## Directory Organization

```
audist/
├── electron/              # Electron main process files
│   ├── main.cjs          # Main process entry point
│   ├── preload.cjs       # Preload script for IPC
│   └── entitlements.mac.plist  # macOS permissions
├── src/                   # React application source
│   ├── components/       # React components
│   │   ├── Settings.jsx  # Settings configuration UI
│   │   ├── Summary.jsx   # Meeting summary display
│   │   └── Waveform.jsx  # Audio waveform visualization
│   ├── assets/           # Static assets
│   │   └── logo.svg      # Application logo
│   ├── App.jsx           # Root application component
│   └── main.jsx          # React entry point
├── .amazonq/             # Amazon Q rules and documentation
│   └── rules/
│       └── memory-bank/  # Project memory bank
├── index.html            # HTML entry point
├── package.json          # Project dependencies and scripts
└── vite.config.js        # Vite build configuration
```

## Core Components

### Electron Layer
- **main.cjs**: Manages application lifecycle, window creation, and system-level operations
- **preload.cjs**: Provides secure IPC bridge between renderer and main process
- **entitlements.mac.plist**: Defines macOS permissions for microphone and screen capture

### React Application
- **App.jsx**: Root component orchestrating the application state and layout
- **Waveform.jsx**: Visualizes audio input with real-time waveform rendering
- **Settings.jsx**: Manages user preferences and audio source configuration
- **Summary.jsx**: Displays AI-generated meeting summaries and transcriptions

## Architectural Patterns

### Electron + React Architecture
- Main process handles system operations (audio capture, file I/O)
- Renderer process runs React UI
- IPC communication bridges the two processes securely

### Component Structure
- Functional React components with hooks
- Component-based UI architecture
- Separation of concerns between visualization, settings, and summary display

### Build System
- Vite for fast development and optimized production builds
- Electron Builder for packaging desktop applications
- Concurrent development workflow (Vite dev server + Electron)
