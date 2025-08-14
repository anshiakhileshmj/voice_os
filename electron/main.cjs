
const { app, BrowserWindow, session } = require('electron');
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
      // Enable web security but allow speech recognition
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: true,
      // Enable microphone access
      enableRemoteModule: false
    }
  });

  // Configure session permissions before loading the page
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = ['microphone', 'camera', 'media', 'mediaKeySystem'];
    if (allowedPermissions.includes(permission)) {
      console.log(`Granting permission: ${permission}`);
      callback(true);
    } else {
      console.log(`Denying permission: ${permission}`);
      callback(false);
    }
  });

  // Set additional permissions for speech recognition
  session.defaultSession.setPermissionCheckHandler((webContents, permission, requestingOrigin) => {
    const allowedPermissions = ['microphone', 'camera', 'media'];
    return allowedPermissions.includes(permission);
  });

  // Handle certificate errors for speech recognition API
  app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
    // Allow speech.googleapis.com certificates
    if (url.includes('googleapis.com') || url.includes('google.com')) {
      event.preventDefault();
      callback(true);
    } else {
      callback(false);
    }
  });

  win.loadFile(path.join(__dirname, '../dist/index.html'));
  
  // Enable DevTools for debugging
  // win.webContents.openDevTools();
  
  // Handle app ready state for speech recognition
  win.webContents.once('dom-ready', () => {
    win.webContents.executeJavaScript(`
      // Ensure speech recognition APIs are available and properly configured
      console.log('Speech Recognition API available:', !!(window.SpeechRecognition || window.webkitSpeechRecognition));
      
      // Override getUserMedia to ensure microphone access
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        console.log('getUserMedia API is available');
      }
    `);
  });
}

// Configure app before ready
app.commandLine.appendSwitch('enable-speech-dispatcher');
app.commandLine.appendSwitch('enable-web-speech-api');
app.commandLine.appendSwitch('enable-features', 'VaapiVideoDecoder');
app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors');
app.commandLine.appendSwitch('disable-web-security');
app.commandLine.appendSwitch('allow-running-insecure-content');

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
