#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('📦 Preparing to publish Voice OS to npm...');

// Check if we're logged into npm
try {
  execSync('npm whoami', { stdio: 'pipe' });
  console.log('✅ Logged into npm');
} catch (error) {
  console.error('❌ Not logged into npm. Please run: npm login');
  process.exit(1);
}

// Check if package.json exists
const packageJsonPath = path.join(rootDir, 'package.json');
if (!fs.existsSync(packageJsonPath)) {
  console.error('❌ package.json not found');
  process.exit(1);
}

// Read and validate package.json
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

if (!packageJson.name || !packageJson.version) {
  console.error('❌ package.json missing name or version');
  process.exit(1);
}

console.log(`📋 Package: ${packageJson.name}@${packageJson.version}`);

// Check if bin script exists
const binScriptPath = path.join(rootDir, 'bin', 'voice-os.js');
if (!fs.existsSync(binScriptPath)) {
  console.error('❌ bin/voice-os.js not found');
  process.exit(1);
}

console.log('✅ All files present');

// Ask for confirmation
console.log('\n🚀 Ready to publish!');
console.log('This will publish the package to npm registry.');
console.log('Make sure you have:');
console.log('1. ✅ Updated version in package.json');
console.log('2. ✅ Tested the package locally');
console.log('3. ✅ Committed all changes');

const readline = await import('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const answer = await new Promise((resolve) => {
  rl.question('\nProceed with publishing? (y/N): ', resolve);
});

rl.close();

if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
  console.log('❌ Publishing cancelled');
  process.exit(0);
}

try {
  console.log('\n📤 Publishing to npm...');
  execSync('npm publish', { stdio: 'inherit', cwd: rootDir });
  console.log('\n✅ Successfully published to npm!');
  console.log(`🌐 Package available at: https://www.npmjs.com/package/${packageJson.name}`);
} catch (error) {
  console.error('\n❌ Failed to publish:', error.message);
  process.exit(1);
} 