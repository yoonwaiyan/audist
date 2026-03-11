'use strict';

const {
  app,
  BrowserWindow,
  ipcMain,
  desktopCapturer,
  shell,
  systemPreferences,
  session,
} = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = !app.isPackaged;

// ─── Window ────────────────────────────────────────────────────────────────────

function createWindow() {
  const win = new BrowserWindow({
    width: 940,
    height: 740,
    minWidth: 720,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0a0f1a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  return win;
}

app.whenReady().then(() => {
  // Allow getDisplayMedia() to work in the renderer
  // useSystemPicker shows the native macOS screen picker which includes
  // "Share audio" on Sequoia (15+) — no BlackHole or extra tools needed
  session.defaultSession.setDisplayMediaRequestHandler((_request, callback) => {
    callback({}); // system picker already handled source + audio selection
  }, { useSystemPicker: true });

  createWindow();

  if (process.platform === 'darwin') {
    systemPreferences.getMediaAccessStatus('screen');
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ─── IPC: Desktop sources (for system audio capture) ──────────────────────────

ipcMain.handle('get-desktop-sources', async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen', 'window'],
      thumbnailSize: { width: 200, height: 150 },
    });
    return sources.map((s) => ({
      id: s.id,
      name: s.name,
      thumbnail: s.thumbnail.toDataURL(),
    }));
  } catch (e) {
    return [];
  }
});

// ─── IPC: Save audio to disk ────────────────────────────────────────────────────

ipcMain.handle('save-audio', async (_event, { buffer, ext }) => {
  const dir = path.join(app.getPath('documents'), 'Audist Recordings');
  fs.mkdirSync(dir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `recording-${timestamp}.${ext}`;
  const filepath = path.join(dir, filename);
  fs.writeFileSync(filepath, Buffer.from(buffer));
  return filepath;
});

// ─── IPC: Reveal saved file in Finder/Explorer ──────────────────────────────────

ipcMain.handle('reveal-file', (_event, filepath) => {
  shell.showItemInFolder(filepath);
});

// ─── IPC: Check permissions ──────────────────────────────────────────────────────

ipcMain.handle('check-permissions', async () => {
  if (process.platform !== 'darwin') return { mic: 'granted', screen: 'granted' };
  return {
    mic: systemPreferences.getMediaAccessStatus('microphone'),
    screen: systemPreferences.getMediaAccessStatus('screen'),
  };
});

ipcMain.handle('request-mic-permission', async () => {
  if (process.platform !== 'darwin') return true;
  return systemPreferences.askForMediaAccess('microphone');
});
