
const { spawn } = require('cross-spawn');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs');

let pythonProcess = null;

async function startPythonServer(packageDir) {
  try {
    const pythonCmd = await detectPython();
    if (!pythonCmd) {
      throw new Error('Python not found. Please run "mjak install" first.');
    }
    
    const serverScript = path.join(packageDir, 'os', 'start_api_server.py');
    if (!fs.existsSync(serverScript)) {
      throw new Error('Python server script not found');
    }
    
    console.log(chalk.yellow('🐍 Starting Python automation server...'));
    
    pythonProcess = spawn(pythonCmd, [serverScript], {
      cwd: path.join(packageDir, 'os'),
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true
    });
    
    // Handle process output
    pythonProcess.stdout.on('data', (data) => {
      const output = data.toString().trim();
      if (output.includes('Uvicorn running')) {
        console.log(chalk.green('✅ Python server running on http://localhost:8000'));
      }
    });
    
    pythonProcess.stderr.on('data', (data) => {
      const error = data.toString().trim();
      if (!error.includes('INFO') && !error.includes('WARNING')) {
        console.error(chalk.red('Python server error:'), error);
      }
    });
    
    pythonProcess.on('close', (code) => {
      if (code !== 0 && code !== null) {
        console.error(chalk.red(`Python server exited with code ${code}`));
      }
      pythonProcess = null;
    });
    
    // Give the server time to start
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    return pythonProcess;
    
  } catch (error) {
    console.error(chalk.red('Failed to start Python server:'), error.message);
    throw error;
  }
}

function stopPythonServer() {
  if (pythonProcess && !pythonProcess.killed) {
    console.log(chalk.yellow('🛑 Stopping Python server...'));
    pythonProcess.kill('SIGTERM');
    pythonProcess = null;
  }
}

async function detectPython() {
  const { spawn } = require('cross-spawn');
  const pythonCommands = ['python3', 'python', 'py'];
  
  for (const cmd of pythonCommands) {
    try {
      const result = await new Promise((resolve, reject) => {
        const child = spawn(cmd, ['--version'], { stdio: 'pipe', shell: true });
        let stdout = '';
        
        child.stdout.on('data', (data) => {
          stdout += data.toString();
        });
        
        child.on('close', (code) => {
          if (code === 0) {
            resolve(stdout);
          } else {
            reject(new Error(`Command failed with exit code ${code}`));
          }
        });
        
        child.on('error', reject);
      });
      
      if (result.includes('Python 3.')) {
        return cmd;
      }
    } catch (error) {
      continue;
    }
  }
  
  return null;
}

module.exports = { startPythonServer, stopPythonServer };
