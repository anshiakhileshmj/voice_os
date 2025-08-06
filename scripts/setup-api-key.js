#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('🔧 Voice OS API Key Setup');

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

// Function to update .env file with API key
function updateEnvFile(apiKey) {
  const osDir = path.join(rootDir, 'os');
  const envPath = path.join(osDir, '.env');
  
  if (!fs.existsSync(envPath)) {
    console.log('❌ .env file not found. Please run: npm install -g @mjak/voice_os');
    return false;
  }
  
  const envContent = `GOOGLE_API_KEY='${apiKey}'`;
  
  try {
    fs.writeFileSync(envPath, envContent);
    console.log('✅ API key saved successfully!');
    return true;
  } catch (error) {
    console.error('❌ Failed to save API key:', error.message);
    return false;
  }
}

// Function to validate API key format
function validateApiKey(apiKey) {
  if (!apiKey || apiKey.length < 10) {
    return false;
  }
  
  // Basic validation - Google API keys are usually long alphanumeric strings
  const apiKeyPattern = /^[A-Za-z0-9_-]{20,}$/;
  return apiKeyPattern.test(apiKey);
}

// Function to prompt user for API key
async function promptForApiKey() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  console.log('\n🌐 Opening Google AI Studio in your browser...');
  console.log('📝 Please follow these steps:');
  console.log('1. Sign in to your Google account');
  console.log('2. Click "Create API Key"');
  console.log('3. Copy your API key');
  console.log('4. Paste it below when prompted\n');
  
  // Open Google AI Studio
  const googleUrl = 'https://aistudio.google.com/app/apikey';
  openUrl(googleUrl);
  
  // Wait a moment for browser to open
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  return new Promise((resolve) => {
    rl.question('🔑 Please paste your Google API key here: ', (apiKey) => {
      rl.close();
      resolve(apiKey.trim());
    });
  });
}

// Function to display pricing information
function displayPricingInfo() {
  console.log('\n💰 Pricing Information:');
  console.log('   • Free Tier: 5 voice chats + 5 automations per month');
  console.log('   • Premium: $15 USD / ₹1200 INR - Unlimited access');
  console.log('   • Payment: UPI/Paytm/Bank Transfer');
  console.log('   • Support: support@mjakvoice.com');
  console.log('');
}

// Main setup function
async function setupApiKey() {
  console.log('🚀 Welcome to Voice OS API Key Setup!');
  console.log('This will help you configure your Google API key.\n');
  
  // Display pricing information
  displayPricingInfo();
  
  // Check if .env file exists
  const osDir = path.join(rootDir, 'os');
  const envPath = path.join(osDir, '.env');
  
  if (!fs.existsSync(envPath)) {
    console.log('❌ .env file not found. Please run: npm install -g @mjak/voice_os');
    process.exit(1);
  }
  
  // Check if API key is already configured
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const apiKeyMatch = envContent.match(/GOOGLE_API_KEY='([^']+)'/);
    
    if (apiKeyMatch && apiKeyMatch[1] && apiKeyMatch[1] !== 'your_api_key_here') {
      console.log('✅ Google API key is already configured!');
      console.log('\n🎉 Setup complete! You can now run:');
      console.log('   voice_os');
      return;
    }
  }
  
  // Prompt for API key
  let apiKey = await promptForApiKey();
  
  // Validate API key
  while (!validateApiKey(apiKey)) {
    console.log('\n❌ Invalid API key format. Please try again.');
    apiKey = await promptForApiKey();
  }
  
  // Update .env file
  if (updateEnvFile(apiKey)) {
    console.log('\n🎉 Setup complete! Your Voice OS is ready to use.');
    console.log('\n📋 Next steps:');
    console.log('1. Run: voice_os');
    console.log('2. The app will start automatically');
    console.log('3. Both frontend and Python backend will launch');
    console.log('4. Open your browser to http://localhost:5173');
    console.log('\n💡 Tip: You can run voice_os from anywhere!');
  } else {
    console.log('\n❌ Setup failed. Please try running the setup again.');
    process.exit(1);
  }
}

// Run setup
setupApiKey().catch(error => {
  console.error('❌ Setup failed:', error.message);
  process.exit(1);
}); 