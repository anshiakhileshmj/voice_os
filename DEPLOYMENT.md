
# MJAK Package Deployment Guide

## Code Protection Strategy

The package is designed to protect your code when distributed:

### 1. Built Assets Only
- Only the `dist/` folder (compiled React app) is included in the npm package
- Source code in `src/` is not distributed
- Users cannot see or modify the React frontend code

### 2. Package File Restrictions
The `package.json` includes a `files` array that limits what gets published:
```json
"files": [
  "bin/",      // CLI scripts (minified/obfuscated if needed)
  "scripts/",  // Server management scripts
  "dist/",     // Built React app
  "os/",       // Python backend (consider obfuscation)
  "README.md"
]
```

### 3. Additional Protection Options

#### For JavaScript Files:
- Use tools like `javascript-obfuscator` to obfuscate the CLI and server scripts
- Consider using `pkg` to compile Node.js scripts to binaries

#### For Python Files:
- Use `pyinstaller` or `cython` to compile Python files to binaries
- Consider using `pyarmor` for Python code obfuscation

#### For Ultimate Protection:
- Convert the Python backend to a compiled binary using `pyinstaller --onefile`
- Replace the Python files in the package with the binary executable

## Local Testing Guide

### 1. Test in Development
```bash
# Build the package
npm run build

# Test CLI locally
node bin/mjak.js setup
node bin/mjak.js install
node bin/mjak.js start

# Or use the test script
node test-package.js
```

### 2. Test Global Installation (Recommended)
```bash
# Link the package globally for testing
npm link

# Test as if installed from npm
mjak setup
mjak install
mjak start

# Clean up after testing
npm unlink -g mjak
```

### 3. Test Package Creation
```bash
# Create a tarball (what would be uploaded to npm)
npm pack

# This creates mjak-1.0.0.tgz
# Test installing from tarball
npm install -g ./mjak-1.0.0.tgz
```

## Publishing to NPM

### 1. Prepare for Publishing
```bash
# Make sure you're logged into npm
npm login

# Verify package contents
npm pack --dry-run

# Check what files will be included
npm publish --dry-run
```

### 2. Publish
```bash
# Publish to npm registry
npm publish

# Or publish with specific tag
npm publish --tag latest
```

### 3. Update Versions
```bash
# Update version and publish
npm version patch  # or minor, major
npm publish
```

## User Installation Flow

Once published, users will install with:

```bash
# Install globally
npm install -g mjak

# Setup (one-time)
mjak setup

# Install dependencies (one-time)
mjak install

# Start the application
mjak start

# Stop the application
mjak stop
```

## File Structure in Global Installation

When installed globally via npm, the package will be located at:
- **Windows**: `%APPDATA%\npm\node_modules\mjak\`
- **macOS/Linux**: `/usr/local/lib/node_modules/mjak/`

Users cannot easily access or modify these files, providing code protection.

## Security Considerations

1. **API Keys**: Your Supabase keys are embedded in the built frontend - ensure they're properly configured for your domain only
2. **Python Dependencies**: The Python requirements install on the user's system - consider security implications
3. **File Permissions**: The package runs with user permissions on their system
4. **Network Access**: Both frontend (8080) and backend (8000) servers are accessible locally

## Troubleshooting Common Issues

### Python Not Found
- Users need Python 3.8+ installed
- The installer detects `python3`, `python`, or `py` commands

### Port Conflicts
- Default ports are 8080 (frontend) and 8000 (backend)
- The app checks for port availability and shows helpful errors

### Permission Issues
- Users may need admin/sudo rights for global npm installation
- Python package installation may require elevated permissions

### Build Issues
- Ensure `npm run build` succeeds before publishing
- All dependencies must be properly listed in package.json
