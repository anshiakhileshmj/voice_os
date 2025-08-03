
#!/bin/bash

# MJ-TTS Startup Script

set -e

echo "🚀 Starting MJ-TTS..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Create output directory
mkdir -p output

# Check available memory
AVAILABLE_MEMORY=$(free -m | awk 'NR==2{printf "%.0f", $7}')
if [ "$AVAILABLE_MEMORY" -lt 2048 ]; then
    echo "⚠️  Warning: Less than 2GB RAM available. TTS performance may be affected."
fi

# Check available disk space
AVAILABLE_SPACE=$(df -BG . | awk 'NR==2{print $4}' | sed 's/G//')
if [ "$AVAILABLE_SPACE" -lt 2 ]; then
    echo "⚠️  Warning: Less than 2GB disk space available. Model downloads may fail."
fi

echo "✅ Environment checks passed"
echo "🎤 Starting MJ-TTS server..."

# Start the server
npm start
