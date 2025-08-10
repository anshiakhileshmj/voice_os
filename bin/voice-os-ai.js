#!/usr/bin/env node

import { spawn, execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Get the directory where this package is installed
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Utility to resolve a script from various install contexts
function resolveScript(relPath) {
  const candidates = [];
  const npmGlobalRoot = (() => {
    try { return execSync('npm root -g', { encoding: 'utf8' }).trim(); } catch { return ''; }
  })();
  const packageDir = path.resolve(__dirname, '..');
  candidates.push(path.join(packageDir, relPath));
  if (npmGlobalRoot) {
    candidates.push(path.join(npmGlobalRoot, 'voice-os-ai', relPath));
  }
  candidates.push(path.join(__dirname, '../node_modules/voice-os-ai', relPath));
  candidates.push(path.join(process.cwd(), relPath));

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

// Ensure top-level await support for Node ESM entrypoint
const main = async () => {
  // The rest of the file remains, but wrapped in this async function
};

// Handle `voice-os-ai setup`: only install deps, no servers
if (process.argv.includes('setup')) {
  const setupScript = resolveScript('scripts/setup-dependencies.js');
  if (!setupScript) {
    console.error('❌ Setup script not found');
    process.exit(1);
  }
  console.log(`🔧 Found setup script at: ${setupScript}`);
  const fileUrl = `file://${setupScript.replace(/\\/g, '/')}`;
  try {
    await import(fileUrl);
    process.exit(0);
  } catch (e) {
    console.error('❌ Failed to execute setup script:', e.message);
    process.exit(1);
  }
}

// Handle `voice-os-ai api`: open Google API page and save key; no servers
if (process.argv.includes('api')) {
  const apiScript = resolveScript('scripts/configure-api.js');
  if (!apiScript) {
    console.error('❌ API configuration script not found');
    process.exit(1);
  }
    console.log(`🔑 Found API configuration script at: ${apiScript}`);
  const fileUrl = `file://${apiScript.replace(/\\/g, '/')}`;
  try {
    await import(fileUrl);
    process.exit(0);
  } catch (e) {
    console.error('❌ Failed to execute API configuration script:', e.message);
    process.exit(1);
  }
}
// Get the correct package directory
let packageDir = path.resolve(__dirname, '..');
let runDir = packageDir;

// Check if we're in development mode (running from source)
const isDevelopment = fs.existsSync(path.join(packageDir, 'src'));

if (!isDevelopment) {
  // We're in a global installation, find the correct directory
  try {
    const npmGlobalRoot = execSync('npm root -g', { encoding: 'utf8' }).trim();
    const globalPackageDir = path.join(npmGlobalRoot, 'voice-os-ai');
    if (fs.existsSync(globalPackageDir)) {
      packageDir = globalPackageDir;
      runDir = globalPackageDir;
    }
  } catch (error) {
    console.log('⚠️  Could not determine npm global root, using current directory');
  }
}

console.log('🚀 Starting MJAK Voice OS');
console.log(`📁 Running from: ${runDir}`);

// Display usage information
console.log('\n📊 Usage Information:');
console.log('   • Free Tier: 5 voice chats + 5 automations per month');
console.log('   • Premium: $15 USD / ₹1200 INR - Unlimited access');
console.log('   • Payment: UPI/Paytm/Bank Transfer');
console.log('   • Support: support@mjakvoice.com');
console.log('   • Edge TTS: 10 Male Voices with Professional Quality');
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
    shell: false
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
    shell: false
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

// Start frontend first, then backend (per requirement)
startFrontend();
if (pythonBackendExists) {
  setTimeout(() => startPythonBackend(), 2500);
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
  console.log('🌐 Starting frontend development server...');
  console.log(`📁 Working directory: ${runDir}`);
  
  // Check if package.json exists
  const packageJsonPath = path.join(runDir, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    console.error('❌ package.json not found in:', runDir);
    console.log('💡 Available files:');
    try {
      const files = fs.readdirSync(runDir);
      files.forEach(file => console.log(`  - ${file}`));
    } catch (error) {
      console.error('❌ Could not read directory:', error.message);
    }
    process.exit(1);
  }
  
  // Start the development server
  const devProcess = spawn('npm', ['run', 'dev'], {
    cwd: runDir,
    stdio: 'pipe',
    shell: true,
    env: { ...process.env, FORCE_COLOR: '1' }
  });

  let serverStarted = false;

  // Handle stdout to detect when server is ready
  devProcess.stdout.on('data', (data) => {
    const output = data.toString();
    console.log(output.trim());
    
    // Check if server is ready and open browser
    if (!serverStarted && (output.includes('Local:') || output.includes('localhost:5173') || output.includes('http://localhost:5173'))) {
      serverStarted = true;
      console.log('🚀 Opening browser...');
      setTimeout(() => {
        openUrl('http://localhost:5173');
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
    console.error('💡 This might be due to:');
    console.error('   - Missing npm or Node.js');
    console.error('   - Missing package.json or dev script');
    console.error('   - Permission issues');
    process.exit(1);
  });

  devProcess.on('exit', (code) => {
    if (code !== 0) {
      console.error(`❌ Voice OS exited with code ${code}`);
      console.error('💡 Check if npm and Node.js are properly installed');
      process.exit(code);
    }
  });

  // Store the frontend process for cleanup
  global.frontendProcess = devProcess;
  
  // Fallback: Open browser after 5 seconds if not already opened
  setTimeout(() => {
    if (!serverStarted) {
      console.log('🚀 Opening browser (fallback)...');
      openUrl('http://localhost:5173');
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
