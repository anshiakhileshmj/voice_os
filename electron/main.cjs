
const { app, BrowserWindow, session } = require('electron');
const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

let pythonProcess = null;

function createWindow () {
  const win = new BrowserWindow({
    width: 1425,
    height: 900,
    icon: path.join(__dirname, '../public/favicon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: true,
      enableRemoteModule: false
    }
  });

  // Configure session permissions
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

  session.defaultSession.setPermissionCheckHandler((webContents, permission, requestingOrigin) => {
    const allowedPermissions = ['microphone', 'camera', 'media'];
    return allowedPermissions.includes(permission);
  });

  // Handle certificate errors for speech recognition API
  app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
    if (url.includes('googleapis.com') || url.includes('google.com')) {
      event.preventDefault();
      callback(true);
    } else {
      callback(false);
    }
  });

  // Load the built React app (starts with landing page)
  win.loadFile(path.join(__dirname, '../dist/index.html'));
  
  // Enable DevTools for debugging in development
  if (process.env.NODE_ENV === 'development') {
    win.webContents.openDevTools();
  }
  
  // Handle app ready state for speech recognition
  win.webContents.once('dom-ready', () => {
    win.webContents.executeJavaScript(`
      console.log('Speech Recognition API available:', !!(window.SpeechRecognition || window.webkitSpeechRecognition));
      
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        console.log('getUserMedia API is available');
      }
    `);
  });

  return win;
}

// Function to start Python backend
function startPythonBackend() {
  const osDir = path.join(__dirname, '../os');
  const pythonScript = path.join(osDir, 'start_api_server.py');
  
  if (!fs.existsSync(pythonScript)) {
    console.log('⚠️  Python backend script not found at:', pythonScript);
    return;
  }

  console.log('🐍 Starting Python automation backend...');
  
  // Try python first, then python3
  const pythonCommands = ['python', 'python3'];
  
  for (const pythonCmd of pythonCommands) {
    try {
      pythonProcess = spawn(pythonCmd, [pythonScript], {
        cwd: osDir,
        stdio: 'pipe',
        shell: process.platform === 'win32'
      });

      pythonProcess.stdout.on('data', (data) => {
        console.log(`🐍 [Python Backend] ${data.toString().trim()}`);
      });

      pythonProcess.stderr.on('data', (data) => {
        console.error(`🐍 [Python Backend Error] ${data.toString().trim()}`);
      });

      pythonProcess.on('error', (error) => {
        console.error(`❌ Failed to start Python backend with ${pythonCmd}:`, error.message);
        pythonProcess = null;
      });

      pythonProcess.on('exit', (code) => {
        if (code !== 0) {
          console.log(`🐍 Python backend exited with code ${code}`);
        }
        pythonProcess = null;
      });

      // If we get here without error, we successfully started
      console.log(`✅ Python backend started with ${pythonCmd}`);
      break;
      
    } catch (error) {
      console.log(`⚠️  Could not start with ${pythonCmd}, trying next...`);
      continue;
    }
  }
}

// Configure app before ready
app.commandLine.appendSwitch('enable-speech-dispatcher');
app.commandLine.appendSwitch('enable-web-speech-api');
app.commandLine.appendSwitch('enable-features', 'VaapiVideoDecoder');
app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors');

app.whenReady().then(() => {
  const mainWindow = createWindow();
  
  // Start Python backend after a short delay
  setTimeout(() => {
    startPythonBackend();
  }, 2000);
  
  // Handle app activation on macOS
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Clean up Python process
  if (pythonProcess) {
    console.log('🛑 Stopping Python backend...');
    pythonProcess.kill('SIGTERM');
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle app quit
app.on('before-quit', () => {
  if (pythonProcess) {
    console.log('🛑 Stopping Python backend...');
    pythonProcess.kill('SIGTERM');
  }
});
