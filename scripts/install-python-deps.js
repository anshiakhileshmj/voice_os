
const { spawn } = require('cross-spawn');
const chalk = require('chalk');
const ora = require('ora');
const path = require('path');
const fs = require('fs');

async function installPythonDeps(packageDir) {
  const spinner = ora('Installing Python dependencies...').start();
  
  try {
    // Check if Python is available
    const pythonCmd = await detectPython();
    if (!pythonCmd) {
      throw new Error('Python not found. Please install Python 3.8+ from https://python.org');
    }
    
    spinner.text = `Using ${pythonCmd}...`;
    
    // Install pip if needed
    await runCommand(pythonCmd, ['-m', 'ensurepip', '--upgrade'], { stdio: 'pipe' });
    
    // Upgrade pip
    await runCommand(pythonCmd, ['-m', 'pip', 'install', '--upgrade', 'pip'], { stdio: 'pipe' });
    
    // Install requirements from the os directory
    const requirementsPath = path.join(packageDir, 'os', 'requirements.txt');
    if (fs.existsSync(requirementsPath)) {
      spinner.text = 'Installing Python packages from requirements.txt...';
      await runCommand(pythonCmd, ['-m', 'pip', 'install', '-r', requirementsPath], { stdio: 'pipe' });
    }
    
    // Install the operate package in development mode
    const osDir = path.join(packageDir, 'os');
    if (fs.existsSync(path.join(osDir, 'setup.py'))) {
      spinner.text = 'Installing MJAK automation engine...';
      await runCommand(pythonCmd, ['-m', 'pip', 'install', '-e', '.'], { 
        cwd: osDir, 
        stdio: 'pipe' 
      });
    }
    
    spinner.succeed(chalk.green('Python dependencies installed successfully!'));
    
  } catch (error) {
    spinner.fail(chalk.red('Failed to install Python dependencies'));
    console.error(chalk.red(error.message));
    process.exit(1);
  }
}

async function detectPython() {
  const pythonCommands = ['python3', 'python', 'py'];
  
  for (const cmd of pythonCommands) {
    try {
      const result = await runCommand(cmd, ['--version'], { stdio: 'pipe' });
      if (result.includes('Python 3.')) {
        return cmd;
      }
    } catch (error) {
      continue;
    }
  }
  
  return null;
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: options.stdio || 'inherit',
      cwd: options.cwd || process.cwd(),
      shell: true
    });
    
    let stdout = '';
    let stderr = '';
    
    if (child.stdout) {
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });
    }
    
    if (child.stderr) {
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
    }
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(stderr || `Command failed with exit code ${code}`));
      }
    });
    
    child.on('error', (error) => {
      reject(error);
    });
  });
}

module.exports = { installPythonDeps };
