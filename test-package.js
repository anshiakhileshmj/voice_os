
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn } = require('cross-spawn');
const chalk = require('chalk');

const packageJson = require('./package.json');

console.log(chalk.blue('🧪 Testing MJAK Package Locally\n'));

// Check if we're in the right directory
if (!fs.existsSync('./bin/mjak.js')) {
  console.error(chalk.red('❌ Error: bin/mjak.js not found. Run this from the project root.'));
  process.exit(1);
}

// Make sure the package is built
console.log(chalk.yellow('📦 Building package...'));
try {
  const buildResult = spawn.sync('npm', ['run', 'build'], { 
    stdio: 'inherit',
    shell: true 
  });
  
  if (buildResult.status !== 0) {
    console.error(chalk.red('❌ Build failed'));
    process.exit(1);
  }
} catch (error) {
  console.error(chalk.red('❌ Build error:'), error.message);
  process.exit(1);
}

console.log(chalk.green('✅ Package built successfully'));

// Test CLI commands
console.log(chalk.blue('\n🔧 Testing CLI commands...'));

const commands = [
  { cmd: 'setup', description: 'Setup command' },
  { cmd: 'install', description: 'Install dependencies' }
];

for (const { cmd, description } of commands) {
  console.log(chalk.yellow(`\n📋 Testing: ${description}`));
  console.log(chalk.gray(`Command: node bin/mjak.js ${cmd}`));
  
  try {
    const result = spawn.sync('node', ['bin/mjak.js', cmd], {
      stdio: 'inherit',
      shell: true,
      timeout: 60000 // 60 second timeout
    });
    
    if (result.status === 0) {
      console.log(chalk.green(`✅ ${description} - SUCCESS`));
    } else {
      console.log(chalk.red(`❌ ${description} - FAILED (exit code: ${result.status})`));
    }
  } catch (error) {
    console.log(chalk.red(`❌ ${description} - ERROR:`, error.message));
  }
}

console.log(chalk.blue('\n🚀 Ready for testing!'));
console.log(chalk.cyan('To test the start command:'));
console.log(chalk.white('  node bin/mjak.js start'));
console.log(chalk.cyan('\nTo simulate global installation:'));
console.log(chalk.white('  npm link'));
console.log(chalk.white('  mjak setup'));
console.log(chalk.white('  mjak install'));
console.log(chalk.white('  mjak start'));
console.log(chalk.cyan('\nTo unlink after testing:'));
console.log(chalk.white('  npm unlink -g mjak'));
