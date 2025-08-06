# Voice OS - NPM Package

AI Voice OS is a powerful voice-controlled desktop application that allows you to control your computer using natural language commands.

## Installation

### Global Installation (Recommended)

```bash
npm install -g @mjak/voice_os
```

The installation will automatically:
1. 🔧 Set up your Google API key
2. 🌐 Open Google AI Studio in your browser
3. 🔑 Guide you through API key creation
4. 💾 Save your API key securely
5. ✅ Complete the setup process

### Local Installation

```bash
npm install @mjak/voice_os
```

## Usage

### Global Installation

After installing globally, you can run Voice OS from anywhere:

```bash
voice_os
```

This will:
1. 🐍 Start the Python automation backend
2. 🌐 Start the development server on port 5173
3. 🔗 Connect both frontend and backend automatically
4. 🎯 Launch the Voice OS application

### Local Installation

If installed locally, you can run it using npx:

```bash
npx @mjak/voice_os
```

Or add it to your package.json scripts:

```json
{
  "scripts": {
    "start-voice": "@mjak/voice_os"
```
```
  }
}
```

Then run:

```bash
npm run start-voice
```

## Features

- 🎤 **Voice Control**: Control your computer with natural language
- 🤖 **AI Assistant**: Powered by advanced language models
- 🎵 **Spotify Integration**: Control music playback with voice
- 📄 **Document Processing**: Upload and process documents
- 🔧 **Automation**: Automate repetitive tasks
- 🎨 **Modern UI**: Beautiful, responsive interface

## Development

If you want to contribute or run from source:

```bash
git clone https://github.com/anshiakhileshmj/fantastic-engine.git
cd fantastic-engine
npm install
npm run dev
```

## Requirements

- Node.js 18+ 
- npm or yarn
- Modern web browser (Chrome, Firefox, Safari, Edge)

## Support

- **Issues**: [GitHub Issues](https://github.com/anshiakhileshmj/fantastic-engine/issues)
- **Documentation**: [GitHub README](https://github.com/anshiakhileshmj/fantastic-engine#readme)

## License

MIT License - see [LICENSE](LICENSE) for details. 