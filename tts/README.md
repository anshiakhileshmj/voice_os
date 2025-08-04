
# Coqui TTS Server

A high-quality Text-to-Speech server using Coqui TTS with a male English voice.

## Setup Instructions

1. **Install Python Dependencies**:
   ```bash
   cd tts
   python -m pip install -r requirements.txt
   ```

2. **Start the TTS Server**:
   ```bash
   python start_server.py
   ```
   
   Or directly:
   ```bash
   python tts_server.py
   ```

3. **Server will run on**: `http://localhost:5001`

## API Endpoints

- `GET /health` - Check server health
- `POST /synthesize` - Convert text to speech
- `GET /voices` - Get available voice information

## Usage Example

```javascript
const response = await fetch('http://localhost:5001/synthesize', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text: 'Hello, this is a test message.' })
});

const data = await response.json();
// data.audio_data contains base64 encoded MP3 audio
```

## Features

- High-quality male English voice using Coqui TTS
- Tacotron2 + WaveGlow models for natural speech
- Pitch adjustment for more masculine sound
- MP3 output with good compression
- CORS enabled for web integration
- Robust error handling

## Troubleshooting

If you encounter issues:
1. Make sure Python 3.8+ is installed
2. Install PyTorch separately if needed: `pip install torch torchaudio`
3. On some systems, you may need to install system dependencies for audio processing
4. The first run may take time to download models (~200MB)
