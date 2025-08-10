#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('🔧 Setting up Voice OS...');

// Function to create complete directory structure
function createDirectoryStructure() {
  const osDir = path.join(rootDir, 'os');
  const operateDir = path.join(osDir, 'operate');
  const modelsDir = path.join(operateDir, 'models');
  const utilsDir = path.join(operateDir, 'utils');
  const weightsDir = path.join(modelsDir, 'weights');

  // Create all directories
  const directories = [osDir, operateDir, modelsDir, utilsDir, weightsDir];

  for (const dir of directories) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`✅ Created directory: ${path.relative(rootDir, dir)}`);
    }
  }

  return true;
}

// Function to create .env file
function createEnvFile() {
  const osDir = path.join(rootDir, 'os');
  const envPath = path.join(osDir, '.env');

  // Check if .env already exists
  if (fs.existsSync(envPath)) {
    console.log('✅ .env file already exists');
    return true;
  }

  // Create .env file with placeholder
  const envContent = `GOOGLE_API_KEY='your_api_key_here'`;

  try {
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Created .env file in os/ directory');
    return true;
  } catch (error) {
    console.error('❌ Failed to create .env file:', error.message);
    return false;
  }
}

// Function to display welcome message
function displayWelcomeMessage() {
  console.log('\n🎉 Welcome to MJAK Voice OS!');
  console.log('🎤 Control your computer with voice commands');
  console.log('🤖 Powered by AI - Built with ❤️ by Akhilesh Chandra');
  console.log('\n🚀 Getting started:');
  console.log('   1. Run: voice_os setup (to install dependencies)');
  console.log('   2. Run: voice_os api (to configure API key)');
  console.log('   3. Run: voice_os (to start the application)');
}

// Main setup function
async function setupVoiceOS() {
  console.log('🔧 Setting up Voice OS...');

  // Create complete directory structure
  if (!createDirectoryStructure()) {
    console.log('❌ Failed to create directory structure. Please try again.');
    process.exit(1);
  }

  // Create .env file
  if (!createEnvFile()) {
    console.log('❌ Setup failed. Please try again.');
    process.exit(1);
  }

  // Display welcome message
  displayWelcomeMessage();
}

// Run setup
setupVoiceOS().catch(error => {
  console.error('❌ Setup failed:', error.message);
  process.exit(1);
}); 