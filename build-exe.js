
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Building MJAK Automation App...');

// Step 1: Build React app
console.log('📦 Building React app...');
try {
  execSync('npm run build', { stdio: 'inherit' });
} catch (error) {
  console.error('React build failed:', error.message);
  process.exit(1);
}

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
  
  // Ensure dist directory exists
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

// Step 3: Install Electron dependencies
console.log('⚡ Installing Electron dependencies...');
if (!fs.existsSync('node_modules/electron')) {
  try {
    execSync('npm install electron electron-builder --save-dev', { stdio: 'inherit' });
  } catch (error) {
    console.error('Electron dependencies installation failed:', error.message);
    process.exit(1);
  }
}

// Step 4: Build Electron app
console.log('📱 Building Electron app...');
try {
  execSync('npx electron-builder --win', { stdio: 'inherit' });
} catch (error) {
  console.error('Electron build failed:', error.message);
  process.exit(1);
}

console.log('✅ Build complete! Check the dist-electron folder for your EXE file.');
