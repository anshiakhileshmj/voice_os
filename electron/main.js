
const { app, BrowserWindow, shell } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;
let pythonProcess;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false, // Don't show until ready-to-show
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../public/favicon.ico')
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:8080');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Show window when ready to prevent blank screen
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Focus on window
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startPythonBackend() {
  try {
    const pythonPath = isDev 
      ? path.join(__dirname, '../os') 
      : path.join(process.resourcesPath, 'os');
    
    console.log('Starting Python backend from:', pythonPath);
    
    pythonProcess = spawn('python', ['start_api_server.py'], {
      cwd: pythonPath,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    pythonProcess.stdout.on('data', (data) => {
      console.log(`Python Backend: ${data}`);
    });

    pythonProcess.stderr.on('data', (data) => {
      console.error(`Python Backend Error: ${data}`);
    });

    pythonProcess.on('close', (code) => {
      console.log(`Python backend exited with code ${code}`);
    });

    pythonProcess.on('error', (error) => {
      console.error('Failed to start Python backend:', error);
    });

  } catch (error) {
    console.error('Error starting Python backend:', error);
  }
}

// App event listeners
app.whenReady().then(() => {
  createWindow();
  
  // Start Python backend after window is created
  setTimeout(() => {
    startPythonBackend();
  }, 2000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Kill Python process when app closes
  if (pythonProcess) {
    pythonProcess.kill();
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  // Kill Python process before quitting
  if (pythonProcess) {
    pythonProcess.kill();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (navigationEvent, navigationURL, frameName, disposition, options) => {
    navigationEvent.preventDefault();
    shell.openExternal(navigationURL);
  });
});
