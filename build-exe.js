
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Building MJAK Automation App...');

// Step 1: Build React app
console.log('📦 Building React app...');
execSync('npm run build', { stdio: 'inherit' });

// Step 2: Create Python executable
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
  
  // Create Python executable
  execSync('pyinstaller --onefile --name api_server api_server.py', { stdio: 'inherit' });
  
  process.chdir('..');
} catch (error) {
  console.error('Python build failed:', error.message);
  process.exit(1);
}

// Step 3: Install Electron dependencies
console.log('⚡ Installing Electron dependencies...');
if (!fs.existsSync('node_modules/electron')) {
  execSync('npm install electron electron-builder --save-dev', { stdio: 'inherit' });
}

// Step 4: Build Electron app
console.log('📱 Building Electron app...');
execSync('npx electron-builder', { stdio: 'inherit' });

console.log('✅ Build complete! Check the dist folder for your EXE file.');
