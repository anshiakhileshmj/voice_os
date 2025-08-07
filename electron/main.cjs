
const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow () {
  const win = new BrowserWindow({
    width: 1425,
    height: 900,
    icon: path.join(__dirname, '../public/favicon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      // Enable web security and permissions for speech recognition
      webSecurity: false,
      allowRunningInsecureContent: true,
      experimentalFeatures: true,
      // Enable microphone access
      enableRemoteModule: false,
      // Additional permissions for speech recognition
      permissions: ['microphone', 'media']
    }
  });

  // Grant microphone permissions
  win.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media' || permission === 'microphone') {
      callback(true);
    } else {
      callback(false);
    }
  });

  win.loadFile(path.join(__dirname, '../dist/index.html'));
  
  // Enable DevTools for debugging speech recognition
  // win.webContents.openDevTools();
  
  // Handle speech recognition API availability
  win.webContents.executeJavaScript(`
    // Ensure speech recognition APIs are available
    if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
      console.warn('Speech Recognition API not available in Electron');
    }
  `);
}

app.whenReady().then(() => {
  createWindow();
  
  // Handle app activation on macOS
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Handle microphone permissions
app.on('ready', () => {
  // Enable microphone access
  app.commandLine.appendSwitch('enable-speech-dispatcher');
  app.commandLine.appendSwitch('enable-web-speech-api');
});
