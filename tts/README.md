# 🎤 Enhanced TTS System

This folder contains the enhanced Text-to-Speech (TTS) system for the Voice OS application, featuring ElevenLabs-style voice settings, automatic fallback, and multilingual support.

## 📁 Files Overview

- **`tts_api.py`** - Main TTS API server with ElevenLabs-style settings
- **`requirements-tts.txt`** - Python dependencies for TTS
- **`test_enhanced_tts.py`** - Comprehensive TTS testing script
- **`test_tts_enhanced.py`** - Enhanced TTS testing with retry logic
- **`test_tts.py`** - Simple TTS testing script
- **`test_tts_fix.js`** - JavaScript TTS testing script
- **`README.md`** - Complete documentation
- **`COMMANDS.txt`** - Quick reference commands

## 🚀 Quick Start Commands

### 1. Install Dependencies
```bash
# Install TTS dependencies
pip install -r requirements-tts.txt

# Or install manually
pip install fastapi uvicorn gtts edge-tts pydantic requests python-multipart aiofiles
```

### 2. Start TTS Server
```bash
# Start the TTS API server
python tts_api.py

# Server will run on http://localhost:8001
```

### 3. Test TTS System
```bash
# Test with comprehensive Python script
python test_enhanced_tts.py

# Test with enhanced Python script
python test_tts_enhanced.py

# Test with simple Python script
python test_tts.py

# Test with JavaScript (in browser console)
# Copy and paste test_tts_fix.js content
```

## 🎯 Features

### ElevenLabs-Style Voice Settings
- **Stability** (0.6): Controls voice consistency and naturalness
- **Similarity Boost** (0.7): Enhances voice character and personality
- **Speed** (1.0): Controls speech rate
- **Use Speaker Boost** (false): Enhances clarity when enabled

### Voice Quality Presets
```python
# Default (Balanced)
{ speed: 1.0, stability: 0.6, similarity_boost: 0.7, use_speaker_boost: false }

# Enhanced (High Quality)
{ speed: 1.0, stability: 0.8, similarity_boost: 0.9, use_speaker_boost: true }

# Fast (Quick Responses)
{ speed: 1.2, stability: 0.5, similarity_boost: 0.6, use_speaker_boost: false }

# Conversation (Optimized)
{ speed: 1.0, stability: 0.7, similarity_boost: 0.8, use_speaker_boost: true }
```

### Supported Languages
- **English (US/UK)** - Male/Female voices
- **Hindi** - Male/Female voices
- **German** - Male/Female voices
- **French** - Male/Female voices

## 🔧 API Endpoints

### Main TTS Endpoint
```bash
POST http://localhost:8001/api/tts/generate
```
**Request Body:**
```json
{
  "text": "Hello, this is a test.",
  "voice_id": "en-us-female-1",
  "language": "en",
  "use_fallback": true,
  "speed": 1.0,
  "stability": 0.6,
  "similarity_boost": 0.7,
  "use_speaker_boost": false
}
```

### Direct Endpoints
```bash
# Edge TTS only
POST http://localhost:8001/api/tts/edge

# Google TTS only
POST http://localhost:8001/api/tts/gtts
```

### Health Check
```bash
GET http://localhost:8001/api/tts/health
```

### Get Available Voices
```bash
GET http://localhost:8001/api/tts/voices
```

## 🛠️ Troubleshooting

### Common Issues

1. **Edge TTS Timeout**
   - The system automatically retries and falls back to Google TTS
   - Check internet connection for Edge TTS

2. **Port Already in Use**
   ```bash
   # Kill process on port 8001
   netstat -ano | findstr :8001
   taskkill /PID <PID> /F
   ```

3. **Dependencies Missing**
   ```bash
   # Reinstall dependencies
   pip install -r requirements-tts.txt --force-reinstall
   ```

### Testing Commands

```bash
# Test health
curl http://localhost:8001/api/tts/health

# Test TTS generation
curl -X POST http://localhost:8001/api/tts/generate \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello","voice_id":"en-us-female-1","language":"en","use_fallback":true,"speed":1.0,"stability":0.6,"similarity_boost":0.7,"use_speaker_boost":false}'
```

## 🔄 Integration with Frontend

The TTS system integrates with the Voice OS frontend through:

- **`src/services/customTTSService.ts`** - Main TTS service
- **`src/services/textToSpeechService.ts`** - TTS wrapper service
- **`src/pages/Index.tsx`** - Frontend integration

## 📊 Performance

- **Response Time**: < 2 seconds for most requests
- **Fallback System**: Automatic Edge TTS → Google TTS
- **Retry Logic**: 3 attempts with 1-second delays
- **Multilingual**: 4 languages with 8 voice options

## 🎉 Success Indicators

When working correctly, you should see:
- ✅ "Edge TTS successful on attempt 1" in logs
- ✅ HTTP 200 responses from API endpoints
- ✅ Audio playback in the frontend
- ✅ No duplicate TTS calls

## 📝 Development Notes

- The TTS API runs on port 8001
- CORS is configured for localhost:5173 (frontend)
- All voice settings are ElevenLabs-compatible
- Automatic fallback ensures reliability

---

**Last Updated**: August 4, 2025  
**Version**: 2.0.0  
**Status**: ✅ Production Ready 