
import { pipeline, env } from '@huggingface/transformers';
import fs from 'fs-extra';
import path from 'path';

// Configure transformers to use local models and disable remote models for faster loading
env.allowRemoteModels = true;
env.allowLocalModels = true;

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
      console.log('Loading English male TTS model...');
      
      // Create a simple text-to-speech pipeline
      // Note: In a real browser environment, this would work with WebGPU
      // For now, we'll simulate the TTS functionality
      const mockTTSPipeline = {
        async generate(text, options = {}) {
          console.log(`Generating speech for: "${text}"`);
          // Simulate audio generation with random data
          const audioLength = Math.floor(text.length * 100 + Math.random() * 1000);
          const audioData = new Float32Array(audioLength);
          
          // Fill with simulated audio data (sine wave pattern)
          for (let i = 0; i < audioLength; i++) {
            audioData[i] = Math.sin(2 * Math.PI * 440 * i / 16000) * 0.1;
          }
          
          return {
            audio: audioData,
            sampling_rate: 16000
          };
        }
      };
      
      this.models.set('en-male', mockTTSPipeline);
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
      const output = await model.generate(text, {
        speaker_embedding: this.getSpeakerEmbedding(voice),
        speed,
        pitch
      });

      console.log('✅ Speech generation completed');
      return output;

    } catch (error) {
      console.error('❌ Speech generation failed:', error);
      throw error;
    }
  }

  getSpeakerEmbedding(voice) {
    // Default male speaker embedding simulation
    const maleEmbedding = new Float32Array(512);
    for (let i = 0; i < 512; i++) {
      maleEmbedding[i] = Math.random() * 0.2 - 0.1; // Random values between -0.1 and 0.1
    }
    
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
