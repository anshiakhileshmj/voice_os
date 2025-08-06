
#!/usr/bin/env node

import { spawn, execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Get the directory where this package is installed
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if setup command is requested
if (process.argv.includes('setup')) {
  // Import and run the setup script
  const setupScript = path.join(__dirname, '../scripts/setup-api-key.js');
  if (fs.existsSync(setupScript)) {
    import(setupScript);
  } else {
    console.log('❌ Setup script not found');
    process.exit(1);
  }
  process.exit(0);
}
const packageDir = path.resolve(__dirname, '..');
const projectDir = path.join(packageDir, 'node_modules', 'voice-os');

// Check if we're in development mode (running from source)
const isDevelopment = fs.existsSync(path.join(packageDir, 'src'));

// Determine the correct directory to run from
const runDir = isDevelopment ? packageDir : projectDir;

console.log('🚀 Starting MJAK Voice OS with Edge TTS...');
console.log(`📁 Running from: ${runDir}`);

// Display usage information
console.log('\n📊 Usage Information:');
console.log('   • Free Tier: 5 voice chats + 5 automations per month');
console.log('   • Premium: $15 USD / ₹1200 INR - Unlimited access');
console.log('   • Payment: UPI/Paytm/Bank Transfer');
console.log('   • Support: support@mjakvoice.com');
console.log('   • Edge TTS: 10 Male Voices with Professional Quality');
console.log('   • Server: http://localhost:8080');
console.log('');

// Check if Python backend exists
const osDir = path.join(runDir, 'os');
const pythonBackendExists = fs.existsSync(osDir);

let pythonProcess = null;

// Function to start Python backend
function startPythonBackend() {
  if (!pythonBackendExists) {
    console.log('⚠️  Python backend not found in os/ directory');
    return;
  }

  console.log('🐍 Starting Python automation backend...');
  
  try {
    // Check if Python is available
    const pythonCheck = spawn('python', ['--version'], { 
      stdio: 'pipe',
      shell: true 
    });
    
    pythonCheck.on('error', () => {
      console.log('⚠️  Python not found. Trying python3...');
      startPythonBackendWithPython3();
    });
    
    pythonCheck.on('exit', (code) => {
      if (code === 0) {
        startPythonBackendWithPython();
      } else {
        startPythonBackendWithPython3();
      }
    });
    
  } catch (error) {
    console.log('⚠️  Error checking Python:', error.message);
    startPythonBackendWithPython3();
  }
}

function startPythonBackendWithPython() {
  const pythonScript = path.join(osDir, 'start_api_server.py');
  
  if (!fs.existsSync(pythonScript)) {
    console.log('⚠️  Python backend script not found');
    return;
  }

  pythonProcess = spawn('python', [pythonScript], {
    cwd: osDir,
    stdio: 'pipe',
    shell: true
  });

  pythonProcess.stdout.on('data', (data) => {
    console.log(`🐍 [Python Backend] ${data.toString().trim()}`);
  });

  pythonProcess.stderr.on('data', (data) => {
    console.log(`🐍 [Python Backend Error] ${data.toString().trim()}`);
  });

  pythonProcess.on('error', (error) => {
    console.error('❌ Failed to start Python backend:', error.message);
  });

  pythonProcess.on('exit', (code) => {
    if (code !== 0) {
      console.log(`🐍 Python backend exited with code ${code}`);
    }
  });
}

function startPythonBackendWithPython3() {
  const pythonScript = path.join(osDir, 'start_api_server.py');
  
  if (!fs.existsSync(pythonScript)) {
    console.log('⚠️  Python backend script not found');
    return;
  }

  pythonProcess = spawn('python3', [pythonScript], {
    cwd: osDir,
    stdio: 'pipe',
    shell: true
  });

  pythonProcess.stdout.on('data', (data) => {
    console.log(`🐍 [Python Backend] ${data.toString().trim()}`);
  });

  pythonProcess.stderr.on('data', (data) => {
    console.log(`🐍 [Python Backend Error] ${data.toString().trim()}`);
  });

  pythonProcess.on('error', (error) => {
    console.error('❌ Failed to start Python backend:', error.message);
  });

  pythonProcess.on('exit', (code) => {
    if (code !== 0) {
      console.log(`🐍 Python backend exited with code ${code}`);
    }
  });
}

// Start Python backend first
if (pythonBackendExists) {
  startPythonBackend();
  
  // Wait a bit for Python backend to start
  setTimeout(() => {
    startFrontend();
  }, 2000);
} else {
  startFrontend();
}

// Function to open URL in default browser
function openUrl(url) {
  const platform = process.platform;
  try {
    if (platform === 'win32') {
      execSync(`start ${url}`, { shell: true });
    } else if (platform === 'darwin') {
      execSync(`open ${url}`);
    } else {
      execSync(`xdg-open ${url}`);
    }
    return true;
  } catch (error) {
    console.error('Failed to open browser:', error.message);
    return false;
  }
}

// Function to start frontend
function startFrontend() {
  console.log('🌐 Starting frontend development server on port 8080...');
  
  // Start the development server with port 8080
  const devProcess = spawn('npm', ['run', 'dev'], {
    cwd: runDir,
    stdio: 'pipe',
    shell: true,
    env: { ...process.env, PORT: '8080' }
  });

  let serverStarted = false;

  // Handle stdout to detect when server is ready
  devProcess.stdout.on('data', (data) => {
    const output = data.toString();
    console.log(output.trim());
    
    // Check if server is ready and open browser (updated to port 8080)
    if (!serverStarted && (output.includes('Local:') || output.includes('localhost:8080') || output.includes('http://localhost:8080'))) {
      serverStarted = true;
      console.log('🚀 Opening browser...');
      setTimeout(() => {
        openUrl('http://localhost:8080');
      }, 2000);
    }
  });

  // Handle stderr
  devProcess.stderr.on('data', (data) => {
    console.log(data.toString().trim());
  });

  // Handle process events
  devProcess.on('error', (error) => {
    console.error('❌ Failed to start Voice OS:', error.message);
    process.exit(1);
  });

  devProcess.on('exit', (code) => {
    if (code !== 0) {
      console.error(`❌ Voice OS exited with code ${code}`);
      process.exit(code);
    }
  });

  // Store the frontend process for cleanup
  global.frontendProcess = devProcess;
  
  // Fallback: Open browser after 5 seconds if not already opened (updated to port 8080)
  setTimeout(() => {
    if (!serverStarted) {
      console.log('🚀 Opening browser (fallback)...');
      openUrl('http://localhost:8080');
    }
  }, 5000);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down Voice OS...');
  
  if (pythonProcess) {
    console.log('🛑 Stopping Python backend...');
    pythonProcess.kill('SIGINT');
  }
  
  if (global.frontendProcess) {
    console.log('🛑 Stopping frontend...');
    global.frontendProcess.kill('SIGINT');
  }
  
  // Give processes time to shutdown gracefully
  setTimeout(() => {
    process.exit(0);
  }, 1000);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down Voice OS...');
  
  if (pythonProcess) {
    pythonProcess.kill('SIGTERM');
  }
  
  if (global.frontendProcess) {
    global.frontendProcess.kill('SIGTERM');
  }
  
  setTimeout(() => {
    process.exit(0);
  }, 1000);
});
