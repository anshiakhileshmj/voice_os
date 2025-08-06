import { supabase } from '@/integrations/supabase/client';
import { VOICE_LANGUAGE_MAP } from './textToSpeechService';

export interface StreamingTTSOptions {
  voiceId?: string;
  rate?: string;
  pitch?: string;
  onAudioChunk?: (audioChunk: ArrayBuffer) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

export class StreamingTTSService {
  private audioQueue: ArrayBuffer[] = [];
  private isPlaying = false;
  private currentAudio: HTMLAudioElement | null = null;

  async convertStreamingTextToSpeech(
    text: string,
    options: StreamingTTSOptions = {}
  ): Promise<void> {
    const {
      voiceId = 'english_us_male',
      rate = '0%',
      pitch = '0Hz',
      onAudioChunk,
      onComplete,
      onError
    } = options;

    if (!text.trim()) {
      onError?.(new Error('Text cannot be empty.'));
      return;
    }

    try {
      console.log('Converting streaming text to speech with Edge TTS:', text.substring(0, 50) + '...');
      console.log('Using voice:', voiceId, 'Language:', VOICE_LANGUAGE_MAP[voiceId] || 'en');
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('User not authenticated');
      }

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

      const arrayBuffer = await response.arrayBuffer();
      
      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        throw new Error('No audio data received');
      }

      console.log('Successfully received audio data from Edge TTS:', arrayBuffer.byteLength, 'bytes');
      
      // Add to queue and play
      this.audioQueue.push(arrayBuffer);
      onAudioChunk?.(arrayBuffer);
      
      if (!this.isPlaying) {
        await this.playNextInQueue();
      }

      onComplete?.();
    } catch (error) {
      console.error('Streaming TTS error:', error);
      onError?.(error instanceof Error ? error : new Error('Unknown TTS error'));
    }
  }

  private async playNextInQueue(): Promise<void> {
    if (this.audioQueue.length === 0) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const audioBuffer = this.audioQueue.shift()!;

    try {
      const blob = new Blob([audioBuffer], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      this.currentAudio = new Audio(url);
      
      return new Promise((resolve, reject) => {
        if (!this.currentAudio) {
          reject(new Error('Audio element not created'));
          return;
        }

        this.currentAudio.onended = () => {
          URL.revokeObjectURL(url);
          this.playNextInQueue();
          resolve();
        };
        
        this.currentAudio.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error('Audio playback failed'));
        };
        
        this.currentAudio.play().catch(reject);
      });
    } catch (error) {
      console.error('Audio playback error:', error);
      this.playNextInQueue(); // Continue with next item
    }
  }

  stopPlayback() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    this.audioQueue = [];
    this.isPlaying = false;
  }

  isCurrentlyPlaying(): boolean {
    return this.isPlaying;
  }

  getLanguageForVoice(voiceId: string): string {
    return VOICE_LANGUAGE_MAP[voiceId] || 'en';
  }
}

export const streamingTTSService = new StreamingTTSService();
