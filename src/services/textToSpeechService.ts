
import { supabase } from '@/integrations/supabase/client';

export interface VoiceOption {
  id: string;
  name: string;
  language: string;
}

export const AVAILABLE_VOICES: VoiceOption[] = [
  { id: 'english_us_male', name: 'English US Male', language: 'English (US)' },
  { id: 'hindi_male', name: 'Hindi Male', language: 'Hindi' },
  { id: 'bengali_male', name: 'Bengali Male', language: 'Bengali' },
  { id: 'gujarati_male', name: 'Gujarati Male', language: 'Gujarati' },
  { id: 'kannada_male', name: 'Kannada Male', language: 'Kannada' },
  { id: 'malayalam_male', name: 'Malayalam Male', language: 'Malayalam' },
  { id: 'marathi_male', name: 'Marathi Male', language: 'Marathi' },
  { id: 'punjabi_male', name: 'Punjabi Male', language: 'Punjabi' },
  { id: 'tamil_male', name: 'Tamil Male', language: 'Tamil' },
  { id: 'telugu_male', name: 'Telugu Male', language: 'Telugu' },
];

export interface TTSOptions {
  voiceId?: string;
  rate?: string; // e.g., '0%', '+20%', '-10%'
  pitch?: string; // e.g., '0Hz', '+50Hz', '-25Hz'
}

export class TextToSpeechService {
  async convertTextToSpeech(
    text: string, 
    options: TTSOptions = {}
  ): Promise<ArrayBuffer> {
    const { voiceId = 'english_us_male', rate = '0%', pitch = '0Hz' } = options;
    
    if (!text.trim()) {
      throw new Error('Text cannot be empty.');
    }

    try {
      console.log('Converting text to speech:', text.substring(0, 50) + '...');
      
      // Get the current session to include auth header
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('User not authenticated');
      }

      // Use direct fetch with proper headers for binary response
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
          rate,
          pitch,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
        throw new Error(error.error || 'Failed to convert text to speech');
      }

      // Get the audio data as ArrayBuffer
      const arrayBuffer = await response.arrayBuffer();
      
      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        throw new Error('No audio data received from text-to-speech service');
      }

      console.log('Successfully received audio data:', arrayBuffer.byteLength, 'bytes');
      return arrayBuffer;
    } catch (error) {
      console.error('Text-to-speech conversion error:', error);
      if (error instanceof Error) {
        throw new Error(`Failed to convert text to speech: ${error.message}`);
      }
      throw new Error('Failed to convert text to speech: Unknown error');
    }
  }

  async playAudio(audioBuffer: ArrayBuffer): Promise<void> {
    try {
      const blob = new Blob([audioBuffer], { type: 'audio/wav' });
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

  isConfigured(): boolean {
    return true; // Always configured since we're using Edge TTS
  }

  getAvailableVoices(): VoiceOption[] {
    return AVAILABLE_VOICES;
  }
}

export const textToSpeechService = new TextToSpeechService();
