
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const isDev = !app.isPackaged;

let mainWindow;
let pythonProcess;
let automateProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: isDev 
        ? path.join(__dirname, 'preload.cjs')
        : path.join(__dirname, '../electron/preload.cjs')
    },
    icon: isDev 
      ? path.join(__dirname, '../public/favicon.ico')
      : path.join(process.resourcesPath, 'app.asar.unpacked/public/favicon.ico')
  });

  // Show window when ready to prevent blank screen
  mainWindow.once('ready-to-show', () => {
    console.log('Window ready to show');
    mainWindow.show();
    
    // Focus the window
    if (process.platform === 'darwin') {
      app.focus();
    } else {
      mainWindow.focus();
    }
  });

  // Handle loading errors
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('Failed to load:', errorCode, errorDescription, validatedURL);
    
    // Try to load a fallback page or show error
    mainWindow.loadURL('data:text/html,<h1>Loading Error</h1><p>Failed to load the application. Please check if the build files exist.</p>');
  });

  // Add loading timeout
  setTimeout(() => {
    if (!mainWindow.isVisible()) {
      console.log('Window not visible after timeout, forcing show');
      mainWindow.show();
    }
  }, 5000);

  // Start Python API server
  if (!isDev) {
    startPythonServer();
  }
  // Start Automate Script
  if (!isDev) {
    startAutomateScript();
  }

  // Load the React app
  if (isDev) {
    console.log('Loading dev server...');
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    const indexPath = path.join(__dirname, '../dist/index.html');
    console.log('Loading index.html from:', indexPath);
    
    // Check if file exists before loading
    const fs = require('fs');
    if (fs.existsSync(indexPath)) {
      mainWindow.loadFile(indexPath);
    } else {
      console.error('Index.html not found at:', indexPath);
      // Try alternative path
      const altPath = path.join(process.resourcesPath, 'app.asar.unpacked/dist/index.html');
      console.log('Trying alternative path:', altPath);
      if (fs.existsSync(altPath)) {
        mainWindow.loadFile(altPath);
      } else {
        // Load error page
        mainWindow.loadURL('data:text/html,<h1>Build Error</h1><p>Application files not found. Please rebuild the application.</p>');
      }
    }
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (pythonProcess) {
      pythonProcess.kill();
    }
    if (automateProcess) {
      automateProcess.kill();
    }
  });
}

function startPythonServer() {
  try {
    const pythonExecutable = path.join(process.resourcesPath, 'python-dist', 'api_server.exe');
    const scriptPath = pythonExecutable;

    console.log('Starting Python server:', scriptPath);

    const args = [];
    const options = {
      cwd: process.resourcesPath,
      stdio: 'pipe'
    };

    pythonProcess = spawn(pythonExecutable, args, options);

    pythonProcess.stdout.on('data', (data) => {
      console.log(`Python: ${data}`);
    });

    pythonProcess.stderr.on('data', (data) => {
      console.error(`Python Error: ${data}`);
    });

    pythonProcess.on('close', (code) => {
      console.log(`Python process exited with code ${code}`);
    });
  } catch (error) {
    console.error('Failed to start Python server:', error);
  }
}

function startAutomateScript() {
  try {
    const pythonExecutable = 'python';
    const args = ['-m', 'operate.main'];
    const cwd = process.resourcesPath;

    console.log('Starting Automate Script:', pythonExecutable, args.join(' '));

    automateProcess = spawn(pythonExecutable, args, { cwd, stdio: 'pipe' });

    automateProcess.stdout && automateProcess.stdout.on('data', (data) => {
      console.log(`Automate: ${data}`);
    });

    automateProcess.stderr && automateProcess.stderr.on('data', (data) => {
      console.error(`Automate Error: ${data}`);
    });

    automateProcess.on('close', (code) => {
      console.log(`Automate process exited with code ${code}`);
    });
  } catch (error) {
    console.error('Failed to start Automate script:', error);
  }
}

app.whenReady().then(() => {
  console.log('App ready, creating window...');
  createWindow();
});

app.on('window-all-closed', () => {
  console.log('All windows closed');
  if (pythonProcess) {
    pythonProcess.kill();
  }
  if (automateProcess) {
    automateProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  console.log('App activated');
  if (mainWindow === null) {
    createWindow();
  }
});

// Handle app startup errors
app.on('ready', () => {
  console.log('Electron app is ready');
});

// Prevent navigation to external URLs
app.on('web-contents-created', (event, contents) => {
  contents.on('will-navigate', (navigationEvent, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    
    if (parsedUrl.origin !== 'http://localhost:5173' && !navigationUrl.startsWith('file://')) {
      navigationEvent.preventDefault();
    }
  });
});
