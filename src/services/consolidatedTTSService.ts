
import { customTTSService } from '../../tts/customTTSService';

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
    voiceId: string = 'en-us-female-1',
    voiceSettings?: TTSVoiceSettings
  ): Promise<{ audioBlob: Blob; modelUsed: string }> {
    if (!text.trim()) {
      throw new Error('Text cannot be empty for TTS conversion');
    }

    console.log('Converting text to speech:', text.substring(0, 50) + '...');

    try {
      // Use your custom TTS service first
      const result = await customTTSService.convertTextToSpeech(
        text,
        voiceId,
        true, // use fallback
        voiceSettings
      );

      console.log(`Successfully received audio data: ${result.audioBlob.size} bytes`);
      return result;
    } catch (error) {
      console.error('Custom TTS failed, trying Supabase edge function:', error);
      
      // Fallback to Supabase edge function
      try {
        const response = await fetch('https://uasluhbtcpuigwkuslum.supabase.co/functions/v1/text-to-speech', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: text.trim(),
            voiceId: voiceId,
            modelId: 'custom_multilingual_v1',
          }),
        });

        if (!response.ok) {
          throw new Error(`Supabase TTS failed: ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const audioBlob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
        
        console.log(`Successfully received audio data from Supabase: ${audioBlob.size} bytes`);
        return { audioBlob, modelUsed: 'supabase-edge-tts' };
      } catch (supabaseError) {
        throw new Error(`All TTS methods failed: Custom: ${error}, Supabase: ${supabaseError}`);
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
