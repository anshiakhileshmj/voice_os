const chalk = require('chalk');
const ora = require('ora');
const open = require('open');
const findProcess = require('find-process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { createFrontendServer } = require('./frontend-server');
const { startPythonServer, stopPythonServer } = require('./python-server');

const PID_FILE = path.join(os.tmpdir(), 'mjak.pid');

let frontendServer = null;
let pythonProcess = null;

async function startApplication(packageDir) {
  const spinner = ora('Starting MJAK application...').start();
  
  try {
    // Check if already running
    if (await isApplicationRunning()) {
      spinner.warn(chalk.yellow('MJAK is already running!'));
      console.log(chalk.cyan('Visit: http://localhost:8080'));
      return;
    }
    
    // Check if dist directory exists
    const distPath = path.join(packageDir, 'dist');
    if (!fs.existsSync(distPath)) {
      throw new Error('Frontend build not found. Please ensure the package was built correctly.');
    }
    
    spinner.text = 'Starting frontend server...';
    // Start frontend server
    frontendServer = await createFrontendServer(packageDir, 8080);
    
    spinner.text = 'Starting Python automation server...';
    // Start Python server
    pythonProcess = await startPythonServer(packageDir);
    
    // Save process info
    const processInfo = {
      frontend: { port: 8080, pid: process.pid },
      python: { port: 8000, pid: pythonProcess ? pythonProcess.pid : null },
      timestamp: new Date().toISOString()
    };
    
    fs.writeFileSync(PID_FILE, JSON.stringify(processInfo, null, 2));
    
    spinner.succeed(chalk.green('🎉 MJAK started successfully!'));
    
    console.log(chalk.green('\n📱 Application URLs:'));
    console.log(chalk.cyan('  Frontend: http://localhost:8080'));
    console.log(chalk.cyan('  API:      http://localhost:8000'));
    console.log(chalk.cyan('  API Docs: http://localhost:8000/docs'));
    
    // Open browser
    console.log(chalk.yellow('\n🌐 Opening browser...'));
    await open('http://localhost:8080');
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log(chalk.yellow('\n🛑 Shutting down MJAK...'));
      await stopApplication();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      await stopApplication();
      process.exit(0);
    });
    
    console.log(chalk.gray('\nPress Ctrl+C to stop the application.'));
    
    // Keep the process alive
    process.stdin.resume();
    
  } catch (error) {
    spinner.fail(chalk.red('Failed to start MJAK'));
    console.error(chalk.red(error.message));
    
    // Cleanup on error
    await stopApplication();
    process.exit(1);
  }
}

async function stopApplication() {
  try {
    // Stop Python server
    if (pythonProcess) {
      stopPythonServer();
    }
    
    // Stop frontend server
    if (frontendServer) {
      frontendServer.close(() => {
        console.log(chalk.green('✅ Frontend server stopped'));
      });
    }
    
    // Kill processes by port if they're still running
    await killProcessOnPort(8080);
    await killProcessOnPort(8000);
    
    // Remove PID file
    if (fs.existsSync(PID_FILE)) {
      fs.unlinkSync(PID_FILE);
    }
    
    console.log(chalk.green('✅ MJAK stopped successfully'));
    
  } catch (error) {
    console.error(chalk.red('Error stopping application:'), error.message);
  }
}

async function isApplicationRunning() {
  try {
    if (!fs.existsSync(PID_FILE)) {
      return false;
    }
    
    const processInfo = JSON.parse(fs.readFileSync(PID_FILE, 'utf8'));
    
    // Check if ports are in use
    const frontendRunning = await isPortInUse(8080);
    const pythonRunning = await isPortInUse(8000);
    
    return frontendRunning || pythonRunning;
  } catch (error) {
    return false;
  }
}

async function isPortInUse(port) {
  try {
    const processes = await findProcess('port', port);
    return processes.length > 0;
  } catch (error) {
    return false;
  }
}

async function killProcessOnPort(port) {
  try {
    const processes = await findProcess('port', port);
    for (const proc of processes) {
      if (proc.pid) {
        try {
          process.kill(proc.pid, 'SIGTERM');
        } catch (error) {
          // Process might already be dead
        }
      }
    }
  } catch (error) {
    // Ignore errors when killing processes
  }
}

module.exports = { startApplication, stopApplication };
