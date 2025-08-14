
#!/usr/bin/env node

import { spawn } from 'child_process';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('🚀 Starting MJAK Voice OS in development mode...');

// Start Vite dev server
console.log('🌐 Starting Vite development server...');
const viteProcess = spawn('npm', ['run', 'dev'], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, NODE_ENV: 'development' }
});

// Wait for Vite to start, then launch Electron
setTimeout(() => {
  console.log('⚡ Starting Electron...');
  
  // Install electron if not present
  try {
    execSync('npx electron --version', { stdio: 'pipe' });
  } catch (error) {
    console.log('📦 Installing electron...');
    execSync('npm install --save-dev electron', { 
      stdio: 'inherit',
      cwd: rootDir 
    });
  }

  const electronProcess = spawn('npx', ['electron', 'electron/main.cjs'], {
    cwd: rootDir,
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, NODE_ENV: 'development' }
  });

  electronProcess.on('exit', () => {
    console.log('🛑 Electron closed, stopping Vite...');
    viteProcess.kill();
    process.exit(0);
  });

}, 3000);

// Handle cleanup
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down development servers...');
  viteProcess.kill();
  process.exit(0);
});
