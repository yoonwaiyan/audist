'use strict';

const {
  app,
  BrowserWindow,
  ipcMain,
  desktopCapturer,
  shell,
  dialog,
  systemPreferences,
} = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');

const isDev = !app.isPackaged;

// ─── Settings storage ──────────────────────────────────────────────────────────

function getSettingsPath() {
  return path.join(app.getPath('userData'), 'settings.json');
}

function readSettings() {
  try {
    return JSON.parse(fs.readFileSync(getSettingsPath(), 'utf8'));
  } catch {
    return {};
  }
}

function writeSettings(updates) {
  const current = readSettings();
  const merged = { ...current, ...updates };
  fs.mkdirSync(path.dirname(getSettingsPath()), { recursive: true });
  fs.writeFileSync(getSettingsPath(), JSON.stringify(merged, null, 2));
}

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
      // Allow getUserMedia / getDisplayMedia
      webSecurity: true,
    },
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
    // Uncomment to open DevTools in development:
    // win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  return win;
}

app.whenReady().then(() => {
  createWindow();

  // On macOS, request screen recording permission proactively
  if (process.platform === 'darwin') {
    const status = systemPreferences.getMediaAccessStatus('screen');
    if (status === 'not-determined') {
      // Will be requested naturally when user tries to capture
    }
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

// ─── IPC: Anthropic API (secure – key never leaves main process) ────────────────

ipcMain.handle('anthropic-summarize', async (_event, { transcript }) => {
  const settings = readSettings();
  const apiKey = settings.anthropicKey;

  if (!apiKey) {
    throw new Error('Anthropic API key not set. Please open Settings and add your key.');
  }

  const systemPrompt = `You are an expert meeting analyst and note-taker. Given a meeting transcript (which may have speaker labels like "You:" or "Speaker N:"), produce a comprehensive meeting summary.

Return ONLY a valid JSON object with exactly these keys (no markdown fences):
{
  "title": "concise meeting title (max 8 words)",
  "tldr": "2-3 sentence executive summary of what happened",
  "keyPoints": ["main discussion point 1", "main discussion point 2"],
  "decisions": ["decision or conclusion 1"],
  "actionItems": [{"task": "...", "owner": "person name or Team", "deadline": "if mentioned, else null"}],
  "nextSteps": "short paragraph about follow-up actions",
  "speakers": ["identified participant names or Speaker 1 / Speaker 2 if unknown"],
  "sentiment": "positive | neutral | mixed | tense"
}

If the transcript is from one person (mic only), still extract key points and action items from what was said. Infer context where possible.`;

  const body = JSON.stringify({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `Meeting transcript:\n\n${transcript}`,
      },
    ],
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) {
              reject(new Error(`Anthropic API error: ${parsed.error.message}`));
            } else {
              resolve(parsed);
            }
          } catch {
            reject(new Error('Invalid response from Anthropic API'));
          }
        });
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
});

// ─── IPC: OpenAI Whisper transcription (optional) ──────────────────────────────

ipcMain.handle('whisper-transcribe', async (_event, { audioPath }) => {
  const settings = readSettings();
  const apiKey = settings.openaiKey;

  if (!apiKey) {
    throw new Error('OpenAI API key not set.');
  }
  if (!fs.existsSync(audioPath)) {
    throw new Error('Audio file not found: ' + audioPath);
  }

  const audioBuffer = fs.readFileSync(audioPath);
  const ext = path.extname(audioPath).slice(1) || 'webm';
  const filename = `recording.${ext}`;

  // Build multipart/form-data manually (no external deps)
  const boundary = '----FormBoundary' + Date.now().toString(16);
  const CRLF = '\r\n';

  const parts = [
    `--${boundary}${CRLF}`,
    `Content-Disposition: form-data; name="model"${CRLF}${CRLF}`,
    `whisper-1${CRLF}`,
    `--${boundary}${CRLF}`,
    `Content-Disposition: form-data; name="response_format"${CRLF}${CRLF}`,
    `verbose_json${CRLF}`,
    `--${boundary}${CRLF}`,
    `Content-Disposition: form-data; name="file"; filename="${filename}"${CRLF}`,
    `Content-Type: audio/webm${CRLF}${CRLF}`,
  ];

  const header = Buffer.from(parts.join(''));
  const footer = Buffer.from(`${CRLF}--${boundary}--${CRLF}`);
  const bodyBuffer = Buffer.concat([header, audioBuffer, footer]);

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'api.openai.com',
        path: '/v1/audio/transcriptions',
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': bodyBuffer.length,
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            reject(new Error('Invalid response from OpenAI'));
          }
        });
      }
    );
    req.on('error', reject);
    req.write(bodyBuffer);
    req.end();
  });
});

// ─── IPC: Settings ──────────────────────────────────────────────────────────────

ipcMain.handle('settings-get', () => {
  const s = readSettings();
  // Never return raw keys to renderer – return masked versions
  return {
    anthropicKeySet: !!s.anthropicKey,
    openaiKeySet: !!s.openaiKey,
    anthropicKey: s.anthropicKey ? '••••••••' + s.anthropicKey.slice(-4) : '',
    openaiKey: s.openaiKey ? '••••••••' + s.openaiKey.slice(-4) : '',
  };
});

ipcMain.handle('settings-set', (_event, { anthropicKey, openaiKey }) => {
  const updates = {};
  // Only update if a real (non-masked) value is provided
  if (anthropicKey && !anthropicKey.startsWith('••••')) {
    updates.anthropicKey = anthropicKey.trim();
  }
  if (openaiKey && !openaiKey.startsWith('••••')) {
    updates.openaiKey = openaiKey.trim();
  }
  writeSettings(updates);
});

// ─── IPC: Save audio to disk ────────────────────────────────────────────────────

ipcMain.handle('save-audio', async (_event, { buffer, ext }) => {
  const dir = path.join(app.getPath('documents'), 'Audist Recordings');
  fs.mkdirSync(dir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `meeting-${timestamp}.${ext}`;
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
