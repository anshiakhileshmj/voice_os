
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  openExternal: (url) => ipcRenderer.invoke('shell:open-external', url),
  getVersion: () => process.versions.electron,
  platform: process.platform,
});

// Log that preload script loaded successfully
console.log('Preload script loaded successfully');
