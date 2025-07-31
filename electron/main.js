
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let pythonProcess = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1425,
    height: 900,
    icon: path.join(__dirname, '../public/favicon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:8080');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

function startPythonServer() {
  return new Promise((resolve, reject) => {
    try {
      const pythonPath = process.platform === 'win32' ? 'python' : 'python3';
      const scriptPath = path.join(__dirname, '../os/start_api_server.py');
      const workingDir = path.join(__dirname, '../os');
      
      console.log('Starting Python server at:', scriptPath);
      console.log('Working directory:', workingDir);
      
      pythonProcess = spawn(pythonPath, [scriptPath], {
        cwd: workingDir,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      pythonProcess.stdout.on('data', (data) => {
        console.log('Python server output:', data.toString());
      });

      pythonProcess.stderr.on('data', (data) => {
        console.error('Python server error:', data.toString());
      });

      pythonProcess.on('close', (code) => {
        console.log(`Python server process exited with code ${code}`);
        pythonProcess = null;
      });

      pythonProcess.on('error', (error) => {
        console.error('Failed to start Python server:', error);
        reject(error);
      });

      // Wait a bit for the server to start
      setTimeout(() => {
        resolve();
      }, 2000);
      
    } catch (error) {
      console.error('Error starting Python server:', error);
      reject(error);
    }
  });
}

app.whenReady().then(() => {
  createWindow();
  
  // Auto-start Python server
  startPythonServer().catch(console.error);
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

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers
ipcMain.handle('start-python-server', async () => {
  if (!pythonProcess) {
    return await startPythonServer();
  }
});

ipcMain.handle('get-server-status', () => {
  return pythonProcess !== null;
});
