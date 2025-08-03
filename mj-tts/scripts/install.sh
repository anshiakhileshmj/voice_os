
#!/bin/bash

# MJ-TTS Installation Script

set -e

echo "📦 Installing MJ-TTS..."

# Check system requirements
echo "🔍 Checking system requirements..."

# Check Node.js version
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version | cut -d 'v' -f 2 | cut -d '.' -f 1)
    if [ "$NODE_VERSION" -lt 16 ]; then
        echo "❌ Node.js version 16+ required. Current version: $(node --version)"
        exit 1
    fi
    echo "✅ Node.js $(node --version) detected"
else
    echo "❌ Node.js not found. Please install Node.js 16+ first."
    exit 1
fi

# Check npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm not found. Please install npm first."
    exit 1
fi

# Check system resources
TOTAL_MEMORY=$(free -m | awk 'NR==2{print $2}')
if [ "$TOTAL_MEMORY" -lt 4096 ]; then
    echo "⚠️  Warning: Recommended minimum 4GB RAM for optimal performance"
fi

# Install dependencies
echo "📥 Installing Node.js dependencies..."
npm install

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p output
mkdir -p logs

# Download and cache models (optional pre-warming)
echo "🤖 Pre-warming models (this may take a few minutes)..."
npm test || echo "⚠️  Model pre-warming failed, models will be downloaded on first use"

echo "🎉 Installation complete!"
echo ""
echo "To start MJ-TTS:"
echo "  npm start"
echo ""
echo "To run tests:"
echo "  npm test"
echo ""
echo "Server will be available at: http://localhost:3001"
