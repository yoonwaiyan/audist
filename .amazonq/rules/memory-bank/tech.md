# Technology Stack

## Programming Languages
- **JavaScript/JSX**: Primary language for React components and UI
- **CommonJS**: Electron main and preload scripts (.cjs files)

## Core Frameworks & Libraries

### Frontend
- **React 18.3.1**: UI framework for building component-based interface
- **React DOM 18.3.1**: React rendering for web

### Desktop Application
- **Electron 33.2.1**: Cross-platform desktop application framework
- **Electron Builder 25.1.8**: Packaging and distribution tool

### Build Tools
- **Vite 6.0.5**: Fast build tool and development server
- **@vitejs/plugin-react 4.3.4**: React support for Vite

## Development Dependencies
- **concurrently 9.1.2**: Run multiple commands concurrently (Vite + Electron)
- **wait-on 8.0.1**: Wait for resources (dev server) before starting Electron

## Development Commands

### Start Development
```bash
npm run dev
```
Runs Vite dev server and Electron concurrently with hot reload

### Build Web Assets
```bash
npm run build
```
Builds optimized production bundle with Vite

### Build Desktop Application
```bash
npm run build:electron
```
Builds web assets and packages Electron app for distribution

### Preview Production Build
```bash
npm run preview
```
Preview production build locally

## Platform Support
- **macOS**: Full support with entitlements for microphone and screen capture
- **Windows**: NSIS installer target

## Build Configuration
- **App ID**: com.audist.app
- **Product Name**: Audist
- **Output Directory**: dist-electron/
- **Distribution Files**: dist/ (web assets) + electron/ (main process)
