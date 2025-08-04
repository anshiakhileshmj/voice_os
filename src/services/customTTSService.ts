
import { supabase } from '@/integrations/supabase/client';

export interface CustomTTSVoice {
  id: string;
  name: string;
  language: string;
  gender: string;
  accent?: string;
}

export const CUSTOM_TTS_VOICES: CustomTTSVoice[] = [
  { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George (US Male)', language: 'en', gender: 'male', accent: 'us' },
  { id: '9BWtsMINqrJLrRacOk9x', name: 'Aria (US Female)', language: 'en', gender: 'female', accent: 'us' },
  { id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Roger (UK Male)', language: 'en', gender: 'male', accent: 'uk' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah (UK Female)', language: 'en', gender: 'female', accent: 'uk' },
  { id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura (Hindi Female)', language: 'hi', gender: 'female' },
  { id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie (Hindi Male)', language: 'hi', gender: 'male' },
  { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam (German Male)', language: 'de', gender: 'male' },
  { id: 'XB0fDUnXU5powFXDhCwa', name: 'Charlotte (French Female)', language: 'fr', gender: 'female' },
];

export class CustomTTSService {
  async convertTextToSpeech(
    text: string, 
    voiceId: string = '9BWtsMINqrJLrRacOk9x',
    modelId: string = 'custom_multilingual_v1'
  ): Promise<ArrayBuffer> {
    if (!text.trim()) {
      throw new Error('Text cannot be empty.');
    }

    try {
      console.log('Converting text to speech with Custom TTS:', text.substring(0, 50) + '...');
      
      // Get the current session to include auth header
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('User not authenticated');
      }

      // Call the updated Supabase Edge Function
      const response = await fetch('https://uasluhbtcpuigwkuslum.supabase.co/functions/v1/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhc2x1aGJ0Y3B1aWd3a3VzbHVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzNDkwOTUsImV4cCI6MjA2NjkyNTA5NX0.hmdgaWm1-Xso9ZIQHiVSWcuPEfu4qmat-YR1qoYAFAs',
        },
        body: JSON.stringify({
          text: text.trim(),
          voiceId,
          modelId,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
        throw new Error(error.error || 'Failed to convert text to speech');
      }

      // Get the audio data as ArrayBuffer
      const arrayBuffer = await response.arrayBuffer();
      
      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        throw new Error('No audio data received from custom TTS service');
      }

      const modelUsed = response.headers.get('X-Model-Used') || 'custom-tts';
      console.log('Successfully received audio data from Custom TTS:', arrayBuffer.byteLength, 'bytes', `(${modelUsed})`);
      return arrayBuffer;
    } catch (error) {
      console.error('Custom TTS conversion error:', error);
      if (error instanceof Error) {
        throw new Error(`Failed to convert text to speech: ${error.message}`);
      }
      throw new Error('Failed to convert text to speech: Unknown error');
    }
  }

  async playAudio(audioBuffer: ArrayBuffer): Promise<void> {
    try {
      const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
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

  getAvailableVoices(): CustomTTSVoice[] {
    return CUSTOM_TTS_VOICES;
  }

  isConfigured(): boolean {
    return true; // Always configured since we're using Supabase edge functions
  }
}

export const customTTSService = new CustomTTSService();
