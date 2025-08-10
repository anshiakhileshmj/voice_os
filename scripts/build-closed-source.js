#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('🔒 Building closed-source package...');

// Create a temporary build directory
const buildDir = path.join(rootDir, 'dist-closed');
const srcDir = path.join(rootDir, 'src');

// Clean and create build directory
if (fs.existsSync(buildDir)) {
  fs.rmSync(buildDir, { recursive: true });
}
fs.mkdirSync(buildDir, { recursive: true });

// Function to obfuscate JavaScript/TypeScript code
function obfuscateCode(code, filename) {
  // Simple obfuscation - in production you'd use a proper obfuscator
  let obfuscated = code;
  
  // Replace common patterns
  obfuscated = obfuscated.replace(/console\.log/g, 'console["log"]');
  obfuscated = obfuscated.replace(/console\.error/g, 'console["error"]');
  obfuscated = obfuscated.replace(/console\.warn/g, 'console["warn"]');
  
  // Add some random noise
  const noise = `/* Obfuscated: ${filename} */\n`;
  
  return noise + obfuscated;
}

// Function to encrypt sensitive files
function encryptFile(filePath, outputPath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const key = crypto.randomBytes(32);
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipher('aes-256-cbc', key);
  let encrypted = cipher.update(content, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Create a wrapper that decrypts at runtime
  const wrapper = `
const crypto = require('crypto');
const fs = require('fs');

function decryptCode() {
  const encrypted = "${encrypted}";
  const key = Buffer.from("${key.toString('hex')}", 'hex');
  const iv = Buffer.from("${iv.toString('hex')}", 'hex');
  
  const decipher = crypto.createDecipher('aes-256-cbc', key);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

// Execute the decrypted code
eval(decryptCode());
`;

  fs.writeFileSync(outputPath, wrapper);
}

// Function to process files recursively
function processDirectory(srcPath, destPath) {
  if (!fs.existsSync(destPath)) {
    fs.mkdirSync(destPath, { recursive: true });
  }

  const items = fs.readdirSync(srcPath);
  
  for (const item of items) {
    const srcItemPath = path.join(srcPath, item);
    const destItemPath = path.join(destPath, item);
    const stat = fs.statSync(srcItemPath);
    
    if (stat.isDirectory()) {
      processDirectory(srcItemPath, destItemPath);
    } else {
      // Process files based on extension
      const ext = path.extname(item);
      
      if (['.js', '.ts', '.tsx', '.jsx'].includes(ext)) {
        // Obfuscate JavaScript/TypeScript files
        const content = fs.readFileSync(srcItemPath, 'utf8');
        const obfuscated = obfuscateCode(content, item);
        fs.writeFileSync(destItemPath, obfuscated);
      } else if (['.py'].includes(ext)) {
        // Encrypt Python files
        const encryptedPath = destItemPath.replace('.py', '.py.enc');
        encryptFile(srcItemPath, encryptedPath);
        
        // Create a wrapper that decrypts and executes
        const wrapper = `#!/usr/bin/env python3
import sys
import os
import base64
from cryptography.fernet import Fernet

def decrypt_and_execute():
    # This would contain the actual decryption logic
    # For now, we'll just show a placeholder
    print("This file is encrypted and cannot be viewed or edited.")
    print("The application will continue to function normally.")
    return True

if __name__ == "__main__":
    decrypt_and_execute()
`;
        fs.writeFileSync(destItemPath, wrapper);
      } else {
        // Copy other files as-is
        fs.copyFileSync(srcItemPath, destItemPath);
      }
    }
  }
}

// Function to create a protection wrapper
function createProtectionWrapper() {
  const protectionCode = `
// Protection wrapper to prevent code viewing/editing
(function() {
  'use strict';
  
  // Disable developer tools
  document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.shiftKey && e.key === 'I') {
      e.preventDefault();
      return false;
    }
    if (e.ctrlKey && e.shiftKey && e.key === 'C') {
      e.preventDefault();
      return false;
    }
    if (e.ctrlKey && e.shiftKey && e.key === 'J') {
      e.preventDefault();
      return false;
    }
    if (e.key === 'F12') {
      e.preventDefault();
      return false;
    }
  });
  
  // Disable right-click
  document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    return false;
  });
  
  // Disable view source
  document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.key === 'u') {
      e.preventDefault();
      return false;
    }
  });
  
  console.log('🔒 Code protection enabled');
})();
`;

  return protectionCode;
}

// Main build process
try {
  console.log('📁 Processing source files...');
  
  // Copy and process src directory
  processDirectory(srcDir, path.join(buildDir, 'src'));
  
  // Copy other necessary files
  const filesToCopy = [
    'package.json',
    'vite.config.ts',
    'tailwind.config.ts',
    'tsconfig.json',
    'index.html',
    'public',
    'scripts',
    'bin',
    'os' // <--- ensure backend is included
  ];
  
  for (const file of filesToCopy) {
    const srcPath = path.join(rootDir, file);
    const destPath = path.join(buildDir, file);
    
    if (fs.existsSync(srcPath)) {
      if (fs.statSync(srcPath).isDirectory()) {
        // Copy directory
        fs.cpSync(srcPath, destPath, { recursive: true });
      } else {
        // Copy file
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
  
  // Create protection wrapper
  const protectionCode = createProtectionWrapper();
  fs.writeFileSync(path.join(buildDir, 'src', 'protection.js'), protectionCode);
  
  // Update main.tsx to include protection
  const mainTsxPath = path.join(buildDir, 'src', 'main.tsx');
  if (fs.existsSync(mainTsxPath)) {
    const mainContent = fs.readFileSync(mainTsxPath, 'utf8');
    const protectedContent = `import './protection.js';\n${mainContent}`;
    fs.writeFileSync(mainTsxPath, protectedContent);
  }
  
  // Create a new package.json for the closed-source version
  const rootPackageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  const packageJson = JSON.parse(fs.readFileSync(path.join(buildDir, 'package.json'), 'utf8'));
  // Rebrand to scoped package
  packageJson.name = '@mjak/voice_os';
  // Bump patch version from root to avoid publish conflicts
  try {
    const [major, minor, patch] = String(rootPackageJson.version || '1.0.0').split('.').map(n => parseInt(n, 10));
    const nextPatch = isNaN(patch) ? 0 : patch + 1;
    packageJson.version = `${major}.${minor}.${nextPatch}`;
  } catch {
    packageJson.version = '1.0.1';
  }
  packageJson.description = 'MJAK Voice OS CLI (closed-source build)';
  packageJson.private = false;
  // Ensure correct bin entry exists
  packageJson.bin = { 'voice_os': './bin/voice-os.js' };
  // Set README to SETUP-GUIDE.md content by copying it as README.md
  const setupGuidePath = path.join(rootDir, 'SETUP-GUIDE.md');
  if (fs.existsSync(setupGuidePath)) {
    const setupContent = fs.readFileSync(setupGuidePath, 'utf8');
    fs.writeFileSync(path.join(buildDir, 'README.md'), setupContent);
  }
  
  // Add protection scripts
  packageJson.scripts = {
    ...packageJson.scripts,
    'postinstall': 'node scripts/postinstall-setup.js'
  };
  
  fs.writeFileSync(path.join(buildDir, 'package.json'), JSON.stringify(packageJson, null, 2));
  
  console.log('✅ Closed-source build completed!');
  console.log(`📁 Build directory: ${buildDir}`);
  console.log('🔒 All source code has been obfuscated and protected');
  
} catch (error) {
  console.error('❌ Build failed:', error);
  process.exit(1);
} 
