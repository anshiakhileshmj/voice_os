
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;
let pythonProcess;
let automateProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../public/o.png'),
    show: false
  });

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Start Python API server
  startPythonServer();
  // Start Automate Script
  startAutomateScript();

  // Load the React app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    const indexPath = path.join(__dirname, '../dist/index.html');
    console.log('Loading index.html from:', indexPath);
    mainWindow.loadFile(indexPath);
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
    const pythonExecutable = isDev 
      ? 'python' 
      : path.join(process.resourcesPath, 'python-dist', 'api_server.exe');
    
    const scriptPath = isDev 
      ? path.join(__dirname, '../os/api_server.py')
      : path.join(process.resourcesPath, 'python-dist', 'api_server.exe');

    console.log('Starting Python server:', scriptPath);
    console.log('Python executable:', pythonExecutable);

    pythonProcess = spawn(pythonExecutable, isDev ? [scriptPath] : [], {
      cwd: isDev ? path.join(__dirname, '../os') : process.resourcesPath,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    pythonProcess.stdout.on('data', (data) => {
      console.log(`Python: ${data}`);
    });

    pythonProcess.stderr.on('data', (data) => {
      console.error(`Python Error: ${data}`);
    });

    pythonProcess.on('close', (code) => {
      console.log(`Python process exited with code ${code}`);
    });

    pythonProcess.on('error', (err) => {
      console.error('Failed to start Python process:', err);
    });
  } catch (error) {
    console.error('Error starting Python server:', error);
  }
}

function startAutomateScript() {
  try {
    const pythonExecutable = isDev 
      ? 'python' 
      : 'python';
    const args = ['-m', 'operate.main'];
    const cwd = isDev ? path.join(__dirname, '../os') : process.resourcesPath;

    console.log('Starting Automate Script:', pythonExecutable, args.join(' '));
    console.log('Working directory:', cwd);

    automateProcess = spawn(pythonExecutable, args, { 
      cwd,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    automateProcess.stdout && automateProcess.stdout.on('data', (data) => {
      console.log(`Automate: ${data}`);
    });

    automateProcess.stderr && automateProcess.stderr.on('data', (data) => {
      console.error(`Automate Error: ${data}`);
    });

    automateProcess.on('close', (code) => {
      console.log(`Automate process exited with code ${code}`);
    });

    automateProcess.on('error', (err) => {
      console.error('Failed to start Automate process:', err);
    });
  } catch (error) {
    console.error('Error starting Automate script:', error);
  }
}

app.whenReady().then(() => {
  createWindow();
});

app.on('window-all-closed', () => {
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
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Handle app quit
app.on('before-quit', () => {
  if (pythonProcess) {
    pythonProcess.kill();
  }
  if (automateProcess) {
    automateProcess.kill();
  }
});
