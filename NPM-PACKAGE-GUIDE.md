# Voice OS - NPM Package Guide

## Overview

Your Voice OS application can now be published as an npm package that users can install globally and run with a simple command. When users run `voice-os`, it will start your development server on port 5173 and open their browser.

## What We've Created

### 1. CLI Script (`bin/voice-os.js`)
- Starts the development server using `npm run dev`
- Works in both development and production environments
- Handles graceful shutdown with Ctrl+C

### 2. Updated `package.json`
- Changed from private to public package
- Added `bin` entry for CLI command
- Added metadata (keywords, repository, license, etc.)
- Added `start:web` script for local testing

### 3. Publishing Script (`scripts/publish-npm.js`)
- Validates package before publishing
- Checks npm login status
- Interactive confirmation before publishing

### 4. Documentation
- `README-NPM.md` - User-facing documentation
- `.npmignore` - Controls what gets published

## How It Works

### For Users (After Publishing)

1. **Install globally:**
   ```bash
   npm install -g voice-os
   ```

2. **Run anywhere:**
   ```bash
   voice-os
   ```

3. **What happens:**
   - Starts Vite dev server on port 5173
   - Opens browser to `http://localhost:5173`
   - Shows your Voice OS application

### For Development

1. **Test locally:**
   ```bash
   npm run start:web
   ```

2. **Publish to npm:**
   ```bash
   npm run publish-npm
   ```

## Publishing Steps

### 1. Prepare for Publishing

```bash
# Make sure you're logged into npm
npm login

# Test the package locally
npm run start:web
```

### 2. Update Version (if needed)

Edit `package.json` and update the version:
```json
{
  "version": "1.0.1"
}
```

### 3. Publish

```bash
npm run publish-npm
```

This will:
- ✅ Check npm login
- ✅ Validate package.json
- ✅ Confirm with you
- ✅ Publish to npm registry

### 4. Verify

After publishing, users can install and run:
```bash
npm install -g voice-os
voice-os
```

## Package Structure

```
voice-os/
├── bin/
│   └── voice-os.js          # CLI entry point
├── scripts/
│   └── publish-npm.js       # Publishing helper
├── src/                     # Your React app
├── package.json             # Package manifest
├── .npmignore              # Exclude files from npm
├── README-NPM.md           # NPM-specific docs
└── NPM-PACKAGE-GUIDE.md   # This guide
```

## Important Notes

### 1. Package Name
- The package name is `voice-os`
- Make sure this name is available on npm before publishing
- You can check availability at: https://www.npmjs.com/package/voice-os

### 2. Dependencies
- All your current dependencies will be included
- Users will need Node.js 18+ and npm

### 3. Development vs Production
- The CLI script detects if it's running from source or installed
- In development: runs from current directory
- In production: runs from `node_modules/voice-os`

### 4. Port Configuration
- Currently hardcoded to port 5173 (Vite default)
- Users can access via `http://localhost:5173`

## Customization Options

### Change Port
Edit `bin/voice-os.js` and modify the Vite command:
```javascript
const devProcess = spawn('npm', ['run', 'dev', '--', '--port', '3000'], {
  // ...
});
```

### Add Browser Opening
Add automatic browser opening:
```javascript
import { exec } from 'child_process';

// After starting the server
setTimeout(() => {
  exec('start http://localhost:5173'); // Windows
  // or: exec('open http://localhost:5173'); // macOS
  // or: exec('xdg-open http://localhost:5173'); // Linux
}, 2000);
```

### Add Configuration
Create a config file for users to customize:
```javascript
// bin/voice-os.js
const configPath = path.join(process.env.HOME || process.env.USERPROFILE, '.voice-os.json');
const config = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath)) : {};
const port = config.port || 5173;
```

## Troubleshooting

### Common Issues

1. **"voice-os is not recognized"**
   - Make sure you installed globally: `npm install -g voice-os`
   - Try restarting your terminal

2. **Port already in use**
   - Kill the process using port 5173
   - Or modify the CLI script to use a different port

3. **Permission denied**
   - On Unix systems, you might need `sudo npm install -g voice-os`
   - Or configure npm to use a different directory

4. **Package name taken**
   - Choose a different name in `package.json`
   - Or use a scoped package: `@yourusername/voice-os`

### Testing Before Publishing

```bash
# Test locally
npm run start:web

# Test the package structure
npm pack

# Test installation
npm install -g ./voice-os-1.0.0.tgz
voice-os
```

## Next Steps

1. **Test the package locally**
2. **Choose a unique package name** (if `voice-os` is taken)
3. **Publish to npm**
4. **Share with users**

Your Voice OS application is now ready to be distributed as an npm package! 🚀 