# Custom Multilingual TTS System

## 🎯 Overview

This custom Text-to-Speech system replaces ElevenLabs with open-source models, providing multilingual support for Hindi, English (UK/US), German, and French with both male and female voices.

## 🌍 Supported Languages & Voices

### English Voices
- **Sarah (US)** - Female, American accent
- **Michael (US)** - Male, American accent  
- **Emma (UK)** - Female, British accent
- **James (UK)** - Male, British accent

### Hindi Voices
- **Priya (Hindi)** - Female, Hindi speaker
- **Raj (Hindi)** - Male, Hindi speaker

### German Voices
- **Anna (German)** - Female, German speaker
- **Hans (German)** - Male, German speaker

### French Voices
- **Sophie (French)** - Female, French speaker
- **Pierre (French)** - Male, French speaker

## 🛠️ Technical Architecture

### TTS Models Used

1. **Coqui TTS (XTTS v2)**
   - High-quality English synthesis
   - Voice cloning capabilities
   - Best for English voices

2. **Microsoft SpeechT5**
   - Multilingual support
   - Good for Hindi, German, French
   - Fast inference

3. **Google TTS (gTTS)**
   - Fallback option
   - Wide language support
   - Requires internet

## 🚀 Installation

### 1. Run Setup Script

```bash
python scripts/setup-tts.py
```

This will:
- Install PyTorch (with CUDA if available)
- Install TTS dependencies
- Download models
- Create reference audio files
- Test the system

### 2. Install Dependencies

```bash
pip install -r os/requirements-tts.txt
```

### 3. Start TTS API

```bash
python os/tts_api.py
```

The API will run on `http://localhost:8001`

## 📊 Model Comparison

| Feature | Coqui TTS | Microsoft SpeechT5 | Google TTS |
|---------|-----------|-------------------|------------|
| Quality | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| Speed | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Languages | English | Multi | Multi |
| Offline | ✅ | ✅ | ❌ |
| Voice Cloning | ✅ | ❌ | ❌ |
| Cost | Free | Free | Free |

## 🔧 API Endpoints

### Health Check
```bash
curl http://localhost:8001/api/tts/health
```

### Get Available Voices
```bash
curl http://localhost:8001/api/tts/voices
```

### Generate Speech (Coqui TTS)
```bash
curl -X POST http://localhost:8001/api/tts/coqui \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello, how are you?",
    "voice_id": "en-us-female-1",
    "language": "en-US",
    "speed": 1.0
  }'
```

### Generate Speech (Microsoft TTS)
```bash
curl -X POST http://localhost:8001/api/tts/microsoft \
  -H "Content-Type: application/json" \
  -d '{
    "text": "नमस्ते, कैसे हो आप?",
    "voice_id": "hi-female-1",
    "language": "hi-IN"
  }'
```

## 🎨 Frontend Integration

### Using Custom TTS Service

```typescript
import { customTTSService } from '@/services/customTTSService';

// Generate speech
const audioBuffer = await customTTSService.convertTextToSpeech(
  "Hello world", 
  "en-us-female-1"
);

// Play audio
await customTTSService.playAudio(audioBuffer);
```

### Voice Selector Component

```typescript
import VoiceSelector from '@/components/VoiceSelector';

<VoiceSelector
  selectedVoice="en-us-female-1"
  onVoiceChange={(voiceId) => setSelectedVoice(voiceId)}
/>
```

## 📁 File Structure

```
├── src/
│   ├── services/
│   │   └── customTTSService.ts      # Frontend TTS service
│   └── components/
│       └── VoiceSelector.tsx        # Voice selection UI
├── os/
│   ├── tts_api.py                   # TTS API server
│   └── requirements-tts.txt         # TTS dependencies
├── scripts/
│   └── setup-tts.py                 # TTS setup script
├── models/                          # Downloaded models
├── reference_audio/                 # Voice reference files
└── CUSTOM_TTS_README.md            # This file
```

## 🔧 Configuration

### Environment Variables

```bash
# TTS API Configuration
TTS_API_HOST=0.0.0.0
TTS_API_PORT=8001
TTS_MODEL_PATH=./models
TTS_REFERENCE_AUDIO_PATH=./reference_audio

# GPU Configuration (optional)
CUDA_VISIBLE_DEVICES=0
```

### Model Settings

```python
# In os/tts_api.py
VOICE_CONFIGS = {
    'en-us-female-1': {
        'language': 'en',
        'gender': 'female',
        'accent': 'us',
        'model': 'coqui-ai/xtts-v2'
    },
    # ... more voices
}
```

## 🚀 Performance Optimization

### GPU Acceleration

```bash
# Install CUDA version of PyTorch
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu118
```

### Model Caching

```python
# Models are automatically cached in ~/.cache/huggingface/
# For Coqui TTS: ~/.local/share/tts/
```

### Batch Processing

```python
# For multiple requests, use batch processing
def generate_batch_tts(texts: List[str], voice_id: str):
    # Implement batch processing for better performance
    pass
```

## 🔍 Troubleshooting

### Common Issues

1. **Model Download Fails**
   ```bash
   # Clear cache and retry
   rm -rf ~/.cache/huggingface/
   python scripts/setup-tts.py
   ```

2. **CUDA Out of Memory**
   ```bash
   # Use CPU instead
   export CUDA_VISIBLE_DEVICES=""
   python os/tts_api.py
   ```

3. **Audio Quality Issues**
   ```python
   # Adjust sample rate and quality settings
   SAMPLE_RATE = 22050
   QUALITY = "high"
   ```

### Debug Mode

```bash
# Enable debug logging
export LOG_LEVEL=DEBUG
python os/tts_api.py
```

## 📈 Monitoring

### Health Metrics

```bash
# Check API health
curl http://localhost:8001/api/tts/health

# Response:
{
  "status": "healthy",
  "service": "Custom TTS API",
  "models_loaded": {
    "coqui_tts": true,
    "speecht5": true
  }
}
```

### Performance Monitoring

```python
# Add timing metrics
import time

start_time = time.time()
audio = generate_tts(text, voice_id)
end_time = time.time()

print(f"TTS generation took {end_time - start_time:.2f} seconds")
```

## 🔐 Security Considerations

1. **Input Validation**
   - Sanitize text input
   - Limit text length
   - Rate limiting

2. **Model Security**
   - Keep models updated
   - Monitor for vulnerabilities
   - Secure model storage

3. **API Security**
   - Add authentication if needed
   - Rate limiting
   - Input sanitization

## 🎯 Future Enhancements

### Planned Features

- [ ] **Voice Cloning**: Upload reference audio for custom voices
- [ ] **Emotion Control**: Add emotional inflection
- [ ] **Speed Control**: Adjust speech rate
- [ ] **Pitch Control**: Modify voice pitch
- [ ] **Batch Processing**: Handle multiple requests efficiently
- [ ] **Streaming**: Real-time speech generation
- [ ] **More Languages**: Add Spanish, Chinese, Arabic
- [ ] **Voice Training**: Custom voice model training

### Model Improvements

- [ ] **Fine-tuned Models**: Custom trained models for better quality
- [ ] **Quantization**: Smaller, faster models
- [ ] **Distillation**: Knowledge distillation for efficiency
- [ ] **Ensemble**: Combine multiple models for better quality

## 💡 Usage Examples

### Basic Usage

```typescript
// Generate English speech
const audio = await customTTSService.convertTextToSpeech(
  "Hello, welcome to Voice OS!",
  "en-us-female-1"
);

// Generate Hindi speech
const hindiAudio = await customTTSService.convertTextToSpeech(
  "नमस्ते, वॉइस ओएस में आपका स्वागत है!",
  "hi-female-1"
);
```

### Advanced Usage

```typescript
// Get available voices by language
const englishVoices = customTTSService.getVoicesByLanguage('en');
const femaleVoices = customTTSService.getVoicesByGender('female');

// Play audio with controls
await customTTSService.playAudio(audioBuffer);
customTTSService.stopAudio();
```

## 📞 Support

- **Issues**: GitHub Issues
- **Documentation**: This README
- **Examples**: See usage examples above
- **Community**: GitHub Discussions

## 🎉 Benefits Over ElevenLabs

### Cost Savings
- **ElevenLabs**: $22/month for 30,000 characters
- **Custom TTS**: Free, unlimited usage

### Privacy
- **ElevenLabs**: Data sent to external servers
- **Custom TTS**: All processing local

### Control
- **ElevenLabs**: Limited customization
- **Custom TTS**: Full control over models and settings

### Reliability
- **ElevenLabs**: Dependent on external service
- **Custom TTS**: Works offline, no API limits

This custom TTS system provides a powerful, cost-effective alternative to ElevenLabs while maintaining high-quality multilingual speech synthesis. 