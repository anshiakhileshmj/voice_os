
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  startPythonServer: () => ipcRenderer.invoke('start-python-server'),
  getServerStatus: () => ipcRenderer.invoke('get-server-status')
});
