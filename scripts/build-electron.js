
#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('🔧 Building MJAK Voice OS Electron App...');

try {
  // Step 1: Build the React app
  console.log('📦 Building React application...');
  execSync('npm run build', { 
    stdio: 'inherit',
    cwd: rootDir 
  });

  // Step 2: Ensure os directory is properly structured
  console.log('🐍 Preparing Python backend...');
  const osSourceDir = path.join(rootDir, 'os');
  const osDestDir = path.join(rootDir, 'dist', 'os');
  
  if (fs.existsSync(osSourceDir)) {
    // Copy os directory to dist for packaging
    if (fs.existsSync(osDestDir)) {
      fs.rmSync(osDestDir, { recursive: true });
    }
    fs.cpSync(osSourceDir, osDestDir, { recursive: true });
    console.log('✅ Python backend prepared');
  } else {
    console.warn('⚠️  OS directory not found, Python automation may not work');
  }

  // Step 3: Install electron-builder if not present
  console.log('🔧 Checking electron-builder...');
  try {
    execSync('npx electron-builder --version', { stdio: 'pipe' });
  } catch (error) {
    console.log('📦 Installing electron-builder...');
    execSync('npm install --save-dev electron-builder', { 
      stdio: 'inherit',
      cwd: rootDir 
    });
  }

  // Step 4: Build the Electron app
  console.log('⚡ Building Electron executable...');
  const platform = process.platform;
  let buildCommand = 'npx electron-builder';
  
  if (platform === 'win32') {
    buildCommand += ' --win';
  } else if (platform === 'darwin') {
    buildCommand += ' --mac';
  } else {
    buildCommand += ' --linux';
  }

  execSync(buildCommand, { 
    stdio: 'inherit',
    cwd: rootDir 
  });

  console.log('✅ Electron build completed successfully!');
  console.log('📁 Check the build/ directory for your executable');
  console.log('🚀 The app will start with the landing page and automatically launch the Python backend');

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
