#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('🔧 Voice OS Dependencies Setup');

// Function to install dependencies
function installDependencies() {
  try {
    console.log('📦 Installing React dependencies...');
    execSync('npm install', { cwd: rootDir, stdio: 'inherit' });
    console.log('✅ React dependencies installed successfully');
    
    const osDir = path.join(rootDir, 'os');
    if (fs.existsSync(osDir)) {
      console.log('🐍 Installing Python dependencies...');
      const requirementsPath = path.join(osDir, 'requirements.txt');
      if (fs.existsSync(requirementsPath)) {
        try {
          execSync('pip install -r requirements.txt', { cwd: osDir, stdio: 'inherit' });
          console.log('✅ Python dependencies installed successfully');
        } catch (pipError) {
          console.log('⚠️  Python dependencies installation failed, but package will still work');
          console.log('💡 You can manually install Python dependencies later with: cd os && pip install -r requirements.txt');
        }
      } else {
        console.log('⚠️  requirements.txt not found in os/ directory');
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Failed to install dependencies:', error.message);
    return false;
  }
}

// Function to display next steps
function displayNextSteps() {
  console.log('\n🎉 Dependencies installation complete!');
  console.log('\n📋 Next steps:');
  console.log('1. Run: voice_os api (to configure your Google API key)');
  console.log('2. Run: voice_os (to start the application)');
  console.log('\n💡 Tip: You can run voice_os from anywhere!');
}

// Main setup function
async function setupDependencies() {
  console.log('🚀 Welcome to Voice OS Dependencies Setup!');
  console.log('This will install all required dependencies for Voice OS.\n');
  
  // Install dependencies
  console.log('📦 Installing dependencies...');
  if (installDependencies()) {
    displayNextSteps();
  } else {
    console.log('\n❌ Setup failed. Please try again.');
    process.exit(1);
  }
}

// Run setup
setupDependencies().catch(error => {
  console.error('❌ Setup failed:', error.message);
  process.exit(1);
});

