
import { pipeline } from '@huggingface/transformers';
import fs from 'fs-extra';
import path from 'path';

class MJTextToSpeech {
  constructor() {
    this.models = new Map();
    this.isInitialized = false;
    this.modelConfigs = {
      'en-male': {
        model: 'microsoft/speecht5_tts',
        voice: 'male',
        lang: 'en'
      }
    };
  }

  async initialize() {
    console.log('🎤 Initializing MJ-TTS...');
    
    try {
      // Initialize English male voice model
      console.log('Loading English male TTS model...');
      const ttsModel = await pipeline(
        'text-to-speech',
        this.modelConfigs['en-male'].model,
        { 
          quantized: true,
          progress_callback: (progress) => {
            if (progress.status === 'downloading') {
              console.log(`Downloading: ${progress.name} - ${Math.round(progress.progress)}%`);
            }
          }
        }
      );
      
      this.models.set('en-male', ttsModel);
      this.isInitialized = true;
      console.log('✅ MJ-TTS initialized successfully!');
      
    } catch (error) {
      console.error('❌ Failed to initialize MJ-TTS:', error);
      throw error;
    }
  }

  async generateSpeech(text, options = {}) {
    if (!this.isInitialized) {
      throw new Error('MJ-TTS not initialized. Call initialize() first.');
    }

    const {
      voice = 'en-male',
      speed = 1.0,
      pitch = 1.0
    } = options;

    console.log(`🎵 Generating speech for: "${text.substring(0, 50)}..."`);

    try {
      const model = this.models.get(voice);
      if (!model) {
        throw new Error(`Voice ${voice} not available`);
      }

      // Generate speech
      const output = await model(text, {
        speaker_embedding: this.getSpeakerEmbedding(voice)
      });

      console.log('✅ Speech generation completed');
      return output;

    } catch (error) {
      console.error('❌ Speech generation failed:', error);
      throw error;
    }
  }

  getSpeakerEmbedding(voice) {
    // Default male speaker embedding for SpeechT5
    // This is a simplified version - in production you'd have proper speaker embeddings
    const maleEmbedding = new Float32Array(512).fill(0.1);
    
    switch (voice) {
      case 'en-male':
        return maleEmbedding;
      default:
        return maleEmbedding;
    }
  }

  async saveAudioToFile(audioData, filename) {
    const outputPath = path.join(process.cwd(), 'output', filename);
    await fs.ensureDir(path.dirname(outputPath));
    
    // Convert Float32Array to WAV format
    const wavBuffer = this.convertToWAV(audioData);
    await fs.writeFile(outputPath, wavBuffer);
    
    console.log(`💾 Audio saved to: ${outputPath}`);
    return outputPath;
  }

  convertToWAV(audioData) {
    // Simple WAV header creation
    const sampleRate = 16000;
    const numChannels = 1;
    const bitsPerSample = 16;
    
    const dataLength = audioData.length * 2;
    const buffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(buffer);
    
    // WAV Header
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * bitsPerSample / 8, true);
    view.setUint16(32, numChannels * bitsPerSample / 8, true);
    view.setUint16(34, bitsPerSample, true);
    writeString(36, 'data');
    view.setUint32(40, dataLength, true);
    
    // Convert float32 to int16
    let offset = 44;
    for (let i = 0; i < audioData.length; i++) {
      const sample = Math.max(-1, Math.min(1, audioData[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }
    
    return Buffer.from(buffer);
  }

  getAvailableVoices() {
    return Object.keys(this.modelConfigs).map(key => ({
      id: key,
      name: this.modelConfigs[key].voice,
      language: this.modelConfigs[key].lang,
      model: this.modelConfigs[key].model
    }));
  }
}

export default MJTextToSpeech;
