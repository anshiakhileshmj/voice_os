
#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs');

const program = new Command();

// Get the installation directory (where this package is installed)
const packageDir = path.dirname(__dirname);

program
  .name('mjak')
  .description('MJAK - AI-powered desktop automation system')
  .version('1.0.0');

program
  .command('install')
  .description('Install Python dependencies for automation engine')
  .action(async () => {
    console.log(chalk.blue('🔧 Installing MJAK dependencies...'));
    const { installPythonDeps } = require(path.join(packageDir, 'scripts', 'install-python-deps.js'));
    await installPythonDeps(packageDir);
  });

program
  .command('start')
  .description('Start MJAK application (frontend + backend)')
  .action(async () => {
    console.log(chalk.green('🚀 Starting MJAK...'));
    const { startApplication } = require(path.join(packageDir, 'scripts', 'launcher.js'));
    await startApplication(packageDir);
  });

program
  .command('stop')
  .description('Stop MJAK application')
  .action(async () => {
    console.log(chalk.red('⏹️  Stopping MJAK...'));
    const { stopApplication } = require(path.join(packageDir, 'scripts', 'launcher.js'));
    await stopApplication();
  });

program
  .command('setup')
  .description('Initial setup and configuration')
  .action(async () => {
    console.log(chalk.yellow('⚙️  Setting up MJAK...'));
    console.log(chalk.green('✅ MJAK is ready to use!'));
    console.log(chalk.cyan('Run "mjak start" to launch the application.'));
  });

program.parse();
