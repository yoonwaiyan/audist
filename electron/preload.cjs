'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Audio source selection
  getDesktopSources: () => ipcRenderer.invoke('get-desktop-sources'),

  // File operations
  saveAudio: (data) => ipcRenderer.invoke('save-audio', data),
  revealFile: (filepath) => ipcRenderer.invoke('reveal-file', filepath),

  // Permissions
  checkPermissions: () => ipcRenderer.invoke('check-permissions'),
  requestMicPermission: () => ipcRenderer.invoke('request-mic-permission'),

  // Environment flag
  isElectron: true,
});
