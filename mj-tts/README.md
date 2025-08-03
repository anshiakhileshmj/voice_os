
# MJ-TTS (MJAK Text-to-Speech)

A custom multilingual text-to-speech system built with open-source models.

## Features

- 🎤 English male voice support
- 🚀 Fast inference with quantized models
- 🌐 REST API server
- 📁 File output support
- 🔄 Batch processing
- 💾 WAV audio format output

## Installation

```bash
cd mj-tts
npm install
```

## Usage

### Start the Server

```bash
npm run dev
```

The server will start on `http://localhost:3001`

### API Endpoints

#### Health Check
```bash
GET /health
```

#### Get Available Voices
```bash
GET /voices
```

#### Generate Speech (JSON Response)
```bash
POST /generate
Content-Type: application/json

{
  "text": "Hello world, this is a test",
  "voice": "en-male",
  "speed": 1.0,
  "pitch": 1.0
}
```

#### Generate Speech (WAV File)
```bash
POST /generate-file
Content-Type: application/json

{
  "text": "Hello world",
  "voice": "en-male"
}
```

#### Batch Generation
```bash
POST /generate-batch
Content-Type: application/json

{
  "texts": ["Hello world", "How are you?", "Goodbye"],
  "voice": "en-male"
}
```

### Test the System

```bash
npm test
```

This will run a comprehensive test of the TTS system and generate a test audio file.

## Programmatic Usage

```javascript
import MJTextToSpeech from './src/index.js';

const tts = new MJTextToSpeech();
await tts.initialize();

const audioData = await tts.generateSpeech("Hello world", { voice: 'en-male' });
await tts.saveAudioToFile(audioData.audio, 'output.wav');
```

## Model Information

- **English Male Voice**: Microsoft SpeechT5 TTS
- **Audio Format**: 16kHz WAV
- **Model Size**: ~200MB (quantized)
- **Languages Supported**: English (more coming soon)

## API Limits

- Maximum text length: 1000 characters per request
- Maximum batch size: 10 texts
- Supported formats: WAV (16-bit PCM)

## Directory Structure

```
mj-tts/
├── src/
│   ├── index.js      # Main TTS class
│   ├── server.js     # Express API server
│   └── test.js       # Test suite
├── output/           # Generated audio files
├── package.json
└── README.md
```

## Future Enhancements

- [ ] Hindi voice support
- [ ] German voice support  
- [ ] French voice support
- [ ] Female voice options
- [ ] Custom voice training
- [ ] Real-time streaming
- [ ] Voice cloning capabilities

## Performance Notes

- First model load takes ~30 seconds
- Subsequent generations: ~2-5 seconds per sentence
- Memory usage: ~1GB RAM with quantized models
- Disk space: ~500MB for all models

## Troubleshooting

### Model Download Issues
If models fail to download, ensure you have a stable internet connection and sufficient disk space.

### Memory Issues
Reduce batch size or use smaller quantized models for lower memory usage.

### Audio Quality
For better quality, you can disable model quantization (increases memory usage):

```javascript
const ttsModel = await pipeline('text-to-speech', model, { quantized: false });
```
