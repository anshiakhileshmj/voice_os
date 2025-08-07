#!/usr/bin/env node

const { spawn } = require('cross-spawn');
const path = require('path');
const fs = require('fs');
const open = require('open');
const readline = require('readline');

// Get the directory where the package is installed
const packageDir = path.dirname(__dirname);
const osDir = path.join(packageDir, 'os');

function showHelp() {
  console.log(`
Voice OS AI - Intelligent Voice-Controlled Automation System

Usage:
  voice-os-ai          Launch Voice OS (starts backend + frontend + opens browser)
  voice-os-ai setup    Install all dependencies (npm + pip)
  voice-os-ai api      Configure Google API key
  voice-os-ai help     Show this help message

Examples:
  voice-os-ai setup    # Install dependencies first
  voice-os-ai api      # Configure your Google API key
  voice-os-ai          # Launch the application
  `);
}

async function setupDependencies() {
  console.log('🚀 Setting up Voice OS AI dependencies...\n');
  
  try {
    // Install npm dependencies
    console.log('📦 Installing frontend dependencies...');
    const npmInstall = spawn('npm', ['install'], { 
      cwd: packageDir, 
      stdio: 'inherit' 
    });
    
    await new Promise((resolve, reject) => {
      npmInstall.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`npm install failed with code ${code}`));
        }
      });
    });

    // Install Python dependencies
    console.log('\n🐍 Installing Python backend dependencies...');
    
    // Check if pip is available
    const pipInstall = spawn('pip', ['install', '-r', 'requirements.txt'], { 
      cwd: osDir, 
      stdio: 'inherit' 
    });
    
    await new Promise((resolve, reject) => {
      pipInstall.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`pip install failed with code ${code}`));
        }
      });
    });

    // Install the operate package
    console.log('\n📋 Installing operate package...');
    const operateInstall = spawn('pip', ['install', '-e', '.'], { 
      cwd: osDir, 
      stdio: 'inherit' 
    });
    
    await new Promise((resolve, reject) => {
      operateInstall.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`operate package install failed with code ${code}`));
        }
      });
    });

    console.log('\n✅ All dependencies installed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Configure your API key: voice-os-ai api');
    console.log('2. Launch Voice OS: voice-os-ai');
    
  } catch (error) {
    console.error('❌ Error during setup:', error.message);
    console.log('\n💡 Make sure you have Python 3.8+ and pip installed');
    console.log('   Python installation: https://python.org/downloads/');
    process.exit(1);
  }
}

async function configureApiKey() {
  console.log('🔑 Configuring Google API Key for Voice OS AI\n');
  
  try {
    // Open Google API Console
    console.log('📖 Opening Google API Console...');
    await open('https://console.cloud.google.com/apis/credentials');
    
    console.log(`
📋 Instructions to get your Google API Key:

1. 🌐 The Google Cloud Console should now be open in your browser
2. 🆕 Create a new project or select an existing one
3. 🔧 Enable the "Generative Language API" (Gemini API)
4. 🔑 Go to "Credentials" → "Create Credentials" → "API Key"
5. 📝 Copy your API key and paste it below
6. 🔒 (Optional) Restrict your API key for security

For detailed instructions, visit: https://ai.google.dev/gemini-api/docs/api-key
    `);

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const apiKey = await new Promise((resolve) => {
      rl.question('🔑 Please paste your Google API key here: ', (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    });

    if (!apiKey) {
      console.log('❌ No API key provided. Exiting...');
      process.exit(1);
    }

    // Create .env file in os directory
    const envPath = path.join(osDir, '.env');
    const envContent = `GOOGLE_API_KEY='${apiKey}'`;
    
    fs.writeFileSync(envPath, envContent);
    
    console.log('\n✅ API key saved successfully!');
    console.log(`📁 Saved to: ${envPath}`);
    console.log('\n🚀 You can now launch Voice OS with: voice-os-ai');
    
  } catch (error) {
    console.error('❌ Error configuring API key:', error.message);
    process.exit(1);
  }
}

async function launchVoiceOS() {
  console.log('🚀 Launching Voice OS AI...\n');
  
  try {
    // Check if .env file exists
    const envPath = path.join(osDir, '.env');
    if (!fs.existsSync(envPath)) {
      console.log('⚠️  No API key found!');
      console.log('📝 Please configure your Google API key first: voice-os-ai api');
      process.exit(1);
    }

    console.log('🐍 Starting Python backend...');
    
    // Start Python backend
    const pythonProcess = spawn('python', ['start_api_server.py'], { 
      cwd: osDir,
      stdio: 'pipe',
      detached: false
    });

    pythonProcess.stdout.on('data', (data) => {
      console.log(`Backend: ${data.toString().trim()}`);
    });

    pythonProcess.stderr.on('data', (data) => {
      console.log(`Backend Error: ${data.toString().trim()}`);
    });

    // Wait a bit for backend to start
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('⚛️  Starting React frontend...');
    
    // Start React frontend
    const reactProcess = spawn('npm', ['run', 'dev'], { 
      cwd: packageDir,
      stdio: 'pipe',
      detached: false
    });

    reactProcess.stdout.on('data', (data) => {
      console.log(`Frontend: ${data.toString().trim()}`);
    });

    reactProcess.stderr.on('data', (data) => {
      console.log(`Frontend: ${data.toString().trim()}`);
    });

    // Wait a bit for frontend to start then open browser
    setTimeout(async () => {
      console.log('\n🌐 Opening Voice OS in your browser...');
      try {
        await open('http://localhost:8080');
      } catch (error) {
        console.log('⚠️  Could not open browser automatically');
        console.log('🌐 Please open http://localhost:8080 manually');
      }
    }, 5000);

    console.log('\n✅ Voice OS AI is running!');
    console.log('📱 Frontend: http://localhost:8080');
    console.log('🔗 Backend API: http://localhost:8000');
    console.log('\n⛔ Press Ctrl+C to stop both servers');

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down Voice OS AI...');
      pythonProcess.kill('SIGTERM');
      reactProcess.kill('SIGTERM');
      process.exit(0);
    });

    // Keep the process alive
    await new Promise(() => {});
    
  } catch (error) {
    console.error('❌ Error launching Voice OS:', error.message);
    process.exit(1);
  }
}

// Parse command line arguments
const command = process.argv[2];

switch (command) {
  case 'setup':
    setupDependencies();
    break;
  case 'api':
    configureApiKey();
    break;
  case 'help':
  case '--help':
  case '-h':
    showHelp();
    break;
  case undefined:
    launchVoiceOS();
    break;
  default:
    console.log(`❌ Unknown command: ${command}`);
    showHelp();
    process.exit(1);
}
