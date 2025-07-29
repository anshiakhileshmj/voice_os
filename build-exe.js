
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Building MJAK Automation App...');

// Step 1: Clean previous builds
console.log('🧹 Cleaning previous builds...');
try {
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true, force: true });
  }
  if (fs.existsSync('dist-electron')) {
    fs.rmSync('dist-electron', { recursive: true, force: true });
  }
  if (fs.existsSync('os/dist')) {
    fs.rmSync('os/dist', { recursive: true, force: true });
  }
} catch (error) {
  console.warn('Warning: Could not clean some directories:', error.message);
}

// Step 2: Build React app
console.log('📦 Building React app...');
try {
  execSync('npm run build', { stdio: 'inherit' });
} catch (error) {
  console.error('React build failed:', error.message);
  process.exit(1);
}

// Step 3: Create Python executable
console.log('🐍 Building Python backend...');
try {
  process.chdir('os');
  
  // Install PyInstaller if not present
  try {
    execSync('pip show pyinstaller', { stdio: 'pipe' });
  } catch {
    console.log('Installing PyInstaller...');
    execSync('pip install pyinstaller', { stdio: 'inherit' });
  }
  
  // Create dist directory
  if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist');
  }
  
  // Create Python executable
  execSync('pyinstaller --onefile --name api_server --distpath dist api_server.py', { stdio: 'inherit' });
  
  process.chdir('..');
} catch (error) {
  console.error('Python build failed:', error.message);
  process.exit(1);
}

// Step 4: Install Electron dependencies
console.log('⚡ Installing Electron dependencies...');
try {
  if (!fs.existsSync('node_modules/electron')) {
    execSync('npm install electron electron-builder --save-dev', { stdio: 'inherit' });
  }
} catch (error) {
  console.error('Electron installation failed:', error.message);
  process.exit(1);
}

// Step 5: Build Electron app
console.log('📱 Building Electron app...');
try {
  execSync('npx electron-builder --win', { stdio: 'inherit' });
} catch (error) {
  console.error('Electron build failed:', error.message);
  process.exit(1);
}

console.log('✅ Build complete! Check the dist-electron folder for your EXE file.');
