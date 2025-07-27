
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Add any electron-specific APIs here if needed
  platform: process.platform
});
