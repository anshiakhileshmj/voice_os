#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('🔧 Setting up Voice OS...');

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

// Function to create .env file
function createEnvFile() {
  const osDir = path.join(rootDir, 'os');
  const envPath = path.join(osDir, '.env');
  
  // Check if .env already exists
  if (fs.existsSync(envPath)) {
    console.log('✅ .env file already exists');
    return true;
  }
  
  // Create os directory if it doesn't exist
  if (!fs.existsSync(osDir)) {
    fs.mkdirSync(osDir, { recursive: true });
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

// Function to display pricing information
function displayPricingInfo() {
  console.log('\n' + '='.repeat(60));
  console.log('💰 MJAK Voice OS - Pricing Information');
  console.log('='.repeat(60));
  
  console.log('\n📊 FREE TIER (What you get now):');
  console.log('   • 5 Voice Chat Sessions per month');
  console.log('   • 5 Computer Automation Commands per month');
  console.log('   • Basic AI Assistant features');
  console.log('   • Monthly usage reset');
  
  console.log('\n👑 PREMIUM TIER ($15 USD / ₹1200 INR):');
  console.log('   • Unlimited Voice Chat Sessions');
  console.log('   • Unlimited Computer Automation');
  console.log('   • Advanced AI Features');
  console.log('   • Priority Support');
  console.log('   • One-time payment (no monthly fees)');
  
  console.log('\n💳 PAYMENT METHODS:');
  console.log('   • UPI: mjak-voice@paytm');
  console.log('   • Paytm: +91 98765 43210');
  console.log('   • Bank Transfer: HDFC Bank');
  console.log('   • Account: MJAK Voice OS');
  
  console.log('\n📋 HOW TO UPGRADE:');
  console.log('   1. Use the app until you reach your free limits');
  console.log('   2. You\'ll see a payment prompt in the app');
  console.log('   3. Send payment via UPI/Paytm/Bank Transfer');
  console.log('   4. Email screenshot to: support@mjakvoice.com');
  console.log('   5. Your premium access will be activated within 24 hours');
  
  console.log('\n🎯 USAGE TRACKING:');
  console.log('   • Each voice conversation = 1 usage');
  console.log('   • Each automation command = 1 usage');
  console.log('   • Limits reset every 30 days');
  console.log('   • Premium users have unlimited access');
  
  console.log('\n📞 SUPPORT:');
  console.log('   • Email: support@mjakvoice.com');
  console.log('   • GitHub: https://github.com/anshiakhileshmj/fantastic-engine');
  console.log('   • Issues: https://github.com/anshiakhileshmj/fantastic-engine/issues');
  
  console.log('\n' + '='.repeat(60));
}

// Function to display welcome message
function displayWelcomeMessage() {
  console.log('\n🎉 Welcome to MJAK Voice OS!');
  console.log('🎤 Control your computer with voice commands');
  console.log('🤖 Powered by AI - Built with ❤️ by Akhilesh Chandra');
  console.log('\n🚀 Getting started:');
  console.log('   1. Run: voice_os setup (to configure API key)');
  console.log('   2. Run: voice_os (to start the application)');
  console.log('   3. Enjoy your free 5 voice chats + 5 automations!');
}

// Main setup function
async function setupVoiceOS() {
  console.log('🔧 Setting up Voice OS...');
  
  // Create .env file
  if (!createEnvFile()) {
    console.log('❌ Setup failed. Please try again.');
    process.exit(1);
  }
  
  // Display welcome message
  displayWelcomeMessage();
  
  // Display pricing information
  displayPricingInfo();
  
  // Check if API key is already configured
  const osDir = path.join(rootDir, 'os');
  const envPath = path.join(osDir, '.env');
  
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const apiKeyMatch = envContent.match(/GOOGLE_API_KEY='([^']+)'/);
    
    if (apiKeyMatch && apiKeyMatch[1] && apiKeyMatch[1] !== 'your_api_key_here') {
      console.log('\n✅ Google API key is already configured!');
      console.log('\n🎉 Setup complete! You can now run:');
      console.log('   voice_os');
      return;
    }
  }
  
  console.log('\n🌐 Opening Google AI Studio in your browser...');
  console.log('📝 Please follow these steps:');
  console.log('1. Sign in to your Google account');
  console.log('2. Click "Create API Key"');
  console.log('3. Copy your API key');
  console.log('4. Run: voice_os setup');
  console.log('\n💡 Tip: You can run voice_os from anywhere!');
  
  // Open Google AI Studio
  const googleUrl = 'https://aistudio.google.com/app/apikey';
  openUrl(googleUrl);
}

// Run setup
setupVoiceOS().catch(error => {
  console.error('❌ Setup failed:', error.message);
  process.exit(1);
}); 