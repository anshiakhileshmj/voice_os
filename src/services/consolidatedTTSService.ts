
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

    // Try Supabase Edge Function first (works in online environment)
    try {
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: {
          text: text.trim(),
          voiceId: voiceId,
          modelId: 'custom_multilingual_v1',
        },
      });

      if (error) {
        throw new Error(`Supabase TTS failed: ${error.message}`);
      }

      if (!data) {
        throw new Error('No audio data received from Supabase TTS');
      }

      // Convert the response to blob
      const audioBlob = new Blob([data], { type: 'audio/mpeg' });
      
      console.log(`Successfully received audio data from Supabase: ${audioBlob.size} bytes`);
      return { audioBlob, modelUsed: 'supabase-edge-tts' };
      
    } catch (supabaseError) {
      console.warn('Supabase TTS failed, trying fallback:', supabaseError);
      
      // Fallback to direct HTTP request (only for development)
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
        return { audioBlob, modelUsed: 'local-tts' };
        
      } catch (localError) {
        throw new Error(`All TTS methods failed: Supabase: ${supabaseError}, Local: ${localError}`);
      }
    }
  }

  async playAudio(audioBlob: Blob): Promise<void> {
    try {
      const url = URL.createObjectURL(audioBlob);
      const audio = new Audio(url);
      
      return new Promise((resolve, reject) => {
        audio.onended = () => {
          URL.revokeObjectURL(url);
          resolve();
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error('Audio playback failed'));
        };
        audio.play().catch(reject);
      });
    } catch (error) {
      console.error('Audio playback error:', error);
      throw new Error('Failed to play audio');
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
