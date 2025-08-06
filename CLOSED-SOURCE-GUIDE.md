# Voice OS - Closed Source Package Guide

## Overview

This guide explains how to build and publish a closed-source version of Voice OS that prevents users from viewing or editing the source code.

## Features

### 🔒 **Code Protection**
- **Obfuscation**: JavaScript/TypeScript code is obfuscated to make it unreadable
- **Encryption**: Python files are encrypted and wrapped with decryption logic
- **Runtime Protection**: Browser-based protection against developer tools
- **File Protection**: Prevents editing with any text editor

### 🐍 **Auto Python Backend**
- **Auto-start**: Python backend starts automatically when frontend launches
- **Cross-platform**: Works with both `python` and `python3` commands
- **Graceful Shutdown**: Both frontend and backend shutdown together
- **Error Handling**: Robust error handling for missing Python or dependencies

## Building the Closed-Source Package

### 1. Build the Protected Version

```bash
npm run build-closed
```

This will:
- ✅ Create a `dist-closed/` directory
- ✅ Obfuscate all JavaScript/TypeScript files
- ✅ Encrypt Python files
- ✅ Add browser protection
- ✅ Create a new `package.json` for the closed version

### 2. Test the Closed-Source Build

```bash
cd dist-closed
npm install
npm run start:web
```

### 3. Publish the Closed-Source Package

```bash
npm run publish-closed
```

## How Code Protection Works

### JavaScript/TypeScript Protection

1. **Obfuscation**: Code is transformed to be unreadable
2. **Console Protection**: Prevents viewing console logs
3. **Browser Protection**: Disables developer tools and right-click

### Python Protection

1. **Encryption**: Python files are encrypted with AES-256
2. **Wrapper Scripts**: Each file gets a decryption wrapper
3. **Runtime Execution**: Code is decrypted only at runtime

### Browser Protection

The following protections are added:
- ❌ Disable F12 key
- ❌ Disable Ctrl+Shift+I (Inspect)
- ❌ Disable Ctrl+Shift+C (Inspect Element)
- ❌ Disable Ctrl+Shift+J (Console)
- ❌ Disable Ctrl+U (View Source)
- ❌ Disable right-click context menu

## Auto Python Backend Integration

### How It Works

1. **Detection**: Checks if `os/` directory exists
2. **Python Detection**: Tries `python` then `python3`
3. **Auto-start**: Starts Python backend before frontend
4. **Logging**: Shows Python backend logs in console
5. **Graceful Shutdown**: Stops both processes together

### Python Backend Features

- **FastAPI Server**: Runs on `http://localhost:8000`
- **Gemini 1.5 Flash**: Uses Google's AI model
- **Automation**: Handles device automation commands
- **Health Check**: `/health` endpoint for status

### Environment Setup

The Python backend requires:
- Python 3.7+
- Google API Key in `.env` file
- Required packages (auto-installed)

## Package Structure (Closed Source)

```
voice-os-closed/
├── bin/
│   └── voice-os.js          # CLI with auto Python backend
├── src/                     # Obfuscated React app
├── os/                      # Encrypted Python backend
├── package.json             # Modified for closed source
├── .npmignore              # Includes OS directory
└── protection.js           # Browser protection code
```

## Publishing Process

### 1. Build and Test

```bash
# Build closed-source version
npm run build-closed

# Test locally
cd dist-closed
npm run start:web
```

### 2. Publish to NPM

```bash
# Publish closed-source package
npm run publish-closed
```

### 3. Verify Installation

Users can then install and run:

```bash
npm install -g voice-os-closed
voice-os-closed
```

## Security Features

### Code Protection Levels

1. **Basic Obfuscation**: Makes code hard to read
2. **Encryption**: Encrypts sensitive Python files
3. **Runtime Protection**: Prevents browser-based inspection
4. **File Protection**: Wrappers prevent direct editing

### Limitations

- **Not 100% Secure**: Determined users can still reverse-engineer
- **Browser Limitations**: Some protections can be bypassed
- **Python Limitations**: Python bytecode can be decompiled

### Best Practices

1. **Regular Updates**: Update obfuscation regularly
2. **Strong Encryption**: Use strong encryption keys
3. **Legal Protection**: Add license terms against reverse engineering
4. **Server-Side Logic**: Keep critical logic on servers

## Troubleshooting

### Common Issues

1. **Python Not Found**
   - Install Python 3.7+ on the system
   - Ensure `python` or `python3` is in PATH

2. **Missing Dependencies**
   - Python backend auto-installs requirements
   - Check `.env` file for Google API key

3. **Port Conflicts**
   - Frontend: Port 5173
   - Backend: Port 8000
   - Ensure ports are available

4. **Permission Issues**
   - Run with appropriate permissions
   - Check file permissions in `os/` directory

### Debug Mode

To run without protection for debugging:

```bash
# Run original version
npm run start:web

# Or modify protection.js to disable protections
```

## Legal Considerations

### License Terms

Add to your package.json:

```json
{
  "license": "PROPRIETARY",
  "private": true,
  "description": "Voice OS - Closed Source Version. Reverse engineering prohibited."
}
```

### User Agreement

Consider adding terms like:
- "Reverse engineering prohibited"
- "Source code modification not allowed"
- "Commercial use restrictions"

## Next Steps

1. **Test Thoroughly**: Test all features in closed-source version
2. **Update Documentation**: Update user docs for closed version
3. **Legal Review**: Review legal terms with lawyer
4. **Publish**: Publish to npm registry
5. **Monitor**: Monitor for any security issues

## Support

For issues with the closed-source build:
- Check the build logs
- Verify Python installation
- Test with original version first
- Review error messages in console

Your Voice OS is now ready as a closed-source package! 🔒 