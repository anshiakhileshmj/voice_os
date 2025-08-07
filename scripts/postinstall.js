
#!/usr/bin/env node

const path = require('path');
const fs = require('fs');

console.log(`
🎉 Voice OS AI installed successfully!

📋 Next steps:
1. Install dependencies: voice-os-ai setup
2. Configure API key: voice-os-ai api  
3. Launch Voice OS: voice-os-ai

For help: voice-os-ai help
`);

// Make sure the bin file is executable
const binPath = path.join(__dirname, '..', 'bin', 'voice-os-ai.js');
if (fs.existsSync(binPath)) {
  try {
    fs.chmodSync(binPath, '755');
  } catch (error) {
    // Ignore chmod errors on Windows
  }
}
