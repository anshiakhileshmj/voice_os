
import { supabase } from '@/integrations/supabase/client';

export interface TTSVoiceSettings {
  speed?: number;
  stability?: number;
  similarity_boost?: number;
  use_speaker_boost?: boolean;
}

export class ConsolidatedTTSService {
  private static instance: ConsolidatedTTSService;
  
  private constructor() {}

  static getInstance(): ConsolidatedTTSService {
    if (!ConsolidatedTTSService.instance) {
      ConsolidatedTTSService.instance = new ConsolidatedTTSService();
    }
    return ConsolidatedTTSService.instance;
  }

  async convertTextToSpeech(
    text: string,
    voiceId: string = 'female-en-us',
    voiceSettings?: TTSVoiceSettings
  ): Promise<{ audioBlob: Blob; modelUsed: string }> {
    if (!text.trim()) {
      throw new Error('Text cannot be empty for TTS conversion');
    }

    console.log('Converting text to speech:', text.substring(0, 50) + '...');

    // Try Supabase Edge Function first
    try {
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: {
          text: text.trim(),
          voiceId: voiceId,
          modelId: 'custom_multilingual_v1',
        },
      });

      if (error) {
        console.warn('Supabase TTS error:', error);
        throw new Error(`Supabase TTS failed: ${error.message}`);
      }

      if (!data) {
        throw new Error('No audio data received from Supabase TTS');
      }

      // Handle different response formats
      let audioBlob: Blob;
      
      if (data instanceof ArrayBuffer) {
        audioBlob = new Blob([data], { type: 'audio/mpeg' });
      } else if (typeof data === 'string') {
        // Handle base64 encoded audio
        const binaryString = atob(data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        audioBlob = new Blob([bytes], { type: 'audio/mpeg' });
      } else {
        // Assume it's already a blob-like object
        audioBlob = new Blob([data], { type: 'audio/mpeg' });
      }
      
      console.log(`Successfully received audio data from Supabase: ${audioBlob.size} bytes`);
      return { audioBlob, modelUsed: 'supabase-custom-tts' };
      
    } catch (supabaseError) {
      console.warn('Supabase TTS failed, trying local fallback:', supabaseError);
      
      // Fallback to local TTS server
      try {
        const response = await fetch('http://localhost:8001/api/tts/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: text.trim(),
            voice_id: voiceId,
            language: 'en',
            use_fallback: true,
            speed: voiceSettings?.speed || 1.0,
            stability: voiceSettings?.stability || 0.6,
            similarity_boost: voiceSettings?.similarity_boost || 0.7,
            use_speaker_boost: voiceSettings?.use_speaker_boost || false
          }),
        });

        if (!response.ok) {
          throw new Error(`Local TTS failed: ${response.statusText}`);
        }

        const audioBlob = await response.blob();
        
        console.log(`Successfully received audio data from local TTS: ${audioBlob.size} bytes`);
        return { audioBlob, modelUsed: 'local-custom-tts' };
        
      } catch (localError) {
        console.error('All TTS methods failed:', { supabaseError, localError });
        throw new Error(`TTS conversion failed: ${supabaseError}`);
      }
    }
  }

  async playAudio(audioBlob: Blob): Promise<void> {
    try {
      // Ensure we have a valid audio blob
      if (!audioBlob || audioBlob.size === 0) {
        throw new Error('Invalid audio blob');
      }

      const url = URL.createObjectURL(audioBlob);
      const audio = new Audio(url);
      
      // Set audio properties for better playback
      audio.preload = 'auto';
      audio.volume = 1.0;
      
      return new Promise((resolve, reject) => {
        const cleanup = () => {
          URL.revokeObjectURL(url);
          audio.removeEventListener('ended', onEnded);
          audio.removeEventListener('error', onError);
          audio.removeEventListener('canplay', onCanPlay);
        };

        const onEnded = () => {
          cleanup();
          resolve();
        };

        const onError = (event: Event) => {
          cleanup();
          console.error('Audio playback error:', event);
          reject(new Error('Audio playback failed'));
        };

        const onCanPlay = () => {
          console.log('Audio is ready to play');
        };

        audio.addEventListener('ended', onEnded);
        audio.addEventListener('error', onError);
        audio.addEventListener('canplay', onCanPlay);
        
        // Start playback
        audio.play().catch((playError) => {
          cleanup();
          console.error('Audio play() failed:', playError);
          reject(new Error(`Audio play failed: ${playError.message}`));
        });
      });
    } catch (error) {
      console.error('Audio setup error:', error);
      throw new Error(`Failed to play audio: ${error.message}`);
    }
  }

  getDefaultVoiceSettings(): TTSVoiceSettings {
    return {
      speed: 1.0,
      stability: 0.6,
      similarity_boost: 0.7,
      use_speaker_boost: false
    };
  }
}

export const consolidatedTTSService = ConsolidatedTTSService.getInstance();
