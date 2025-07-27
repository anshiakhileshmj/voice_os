
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  searchPDFFile: (filename) => ipcRenderer.invoke('search-pdf-file', filename),
  getAllPDFFiles: () => ipcRenderer.invoke('get-all-pdf-files'),
});
