
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
    icon: path.join(__dirname, '../public/favicon.ico')
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
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
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
  const pythonExecutable = isDev 
    ? 'python' 
    : path.join(process.resourcesPath, 'python-dist', 'api_server.exe');
  
  const scriptPath = isDev 
    ? path.join(__dirname, '../os/api_server.py')
    : path.join(process.resourcesPath, 'python-dist', 'api_server.exe');

  console.log('Starting Python server:', scriptPath);

  pythonProcess = spawn(pythonExecutable, isDev ? [scriptPath] : [], {
    cwd: isDev ? path.join(__dirname, '../os') : process.resourcesPath
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
}

function startAutomateScript() {
  // In dev, run: python -m operate.main
  // In prod, run: python (or bundled python) -m operate.main
  const pythonExecutable = isDev 
    ? 'python' 
    : 'python'; // For production, ensure python is bundled or in PATH
  const args = ['-m', 'operate.main'];
  const cwd = isDev ? path.join(__dirname, '../os') : process.resourcesPath;

  console.log('Starting Automate Script:', pythonExecutable, args.join(' '));

  automateProcess = spawn(pythonExecutable, args, { cwd });

  automateProcess.stdout && automateProcess.stdout.on('data', (data) => {
    console.log(`Automate: ${data}`);
  });

  automateProcess.stderr && automateProcess.stderr.on('data', (data) => {
    console.error(`Automate Error: ${data}`);
  });

  automateProcess.on('close', (code) => {
    console.log(`Automate process exited with code ${code}`);
  });
}

app.whenReady().then(createWindow);

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
  if (mainWindow === null) {
    createWindow();
  }
});
