'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Audio source selection
  getDesktopSources: () => ipcRenderer.invoke('get-desktop-sources'),

  // AI features
  summarize: (params) => ipcRenderer.invoke('anthropic-summarize', params),
  transcribeAudio: (params) => ipcRenderer.invoke('whisper-transcribe', params),

  // Settings
  getSettings: () => ipcRenderer.invoke('settings-get'),
  saveSettings: (updates) => ipcRenderer.invoke('settings-set', updates),

  // File operations
  saveAudio: (data) => ipcRenderer.invoke('save-audio', data),
  revealFile: (filepath) => ipcRenderer.invoke('reveal-file', filepath),

  // Permissions
  checkPermissions: () => ipcRenderer.invoke('check-permissions'),
  requestMicPermission: () => ipcRenderer.invoke('request-mic-permission'),

  // Environment flag
  isElectron: true,
});
