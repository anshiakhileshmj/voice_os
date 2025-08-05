
import { customTTSService, convertTextToSpeech, AVAILABLE_VOICES, Voice } from './customTTSService';

// Enhanced Text-to-Speech Service
// Wrapper around custom TTS with ElevenLabs-style settings

export interface VoiceSettings {
  speed?: number;
  stability?: number;
  similarity_boost?: number;
  use_speaker_boost?: boolean;
}

class TextToSpeechService {
  private audioElement: HTMLAudioElement | null = null;
  private isPlaying = false;

  /**
   * Speak text with enhanced voice settings
   */
  async speak(
    text: string,
    voiceId: string = 'en-us-female-1',
    voiceSettings?: VoiceSettings
  ): Promise<void> {
    try {
      // Stop any currently playing audio
      this.stop();

      // Convert text to speech with ElevenLabs-style settings
      const { audioBlob, modelUsed } = await convertTextToSpeech(
        text,
        voiceId,
        voiceSettings || this.getDefaultVoiceSettings()
      );

      // Create audio element and play
      const audioUrl = URL.createObjectURL(audioBlob);
      this.audioElement = new Audio(audioUrl);
      
      this.audioElement.onended = () => {
        this.isPlaying = false;
        URL.revokeObjectURL(audioUrl);
      };

      this.audioElement.onerror = (error) => {
        console.error('Audio playback error:', error);
        this.isPlaying = false;
        URL.revokeObjectURL(audioUrl);
      };

      this.isPlaying = true;
      await this.audioElement.play();

      console.log(`TTS successful using ${modelUsed} with settings:`, voiceSettings);

    } catch (error) {
      console.error('TTS error:', error);
      throw new Error(`Failed to speak text: ${error.message}`);
    }
  }

  /**
   * Stop current audio playback
   */
  stop(): void {
    if (this.audioElement && this.isPlaying) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
      this.isPlaying = false;
    }
  }

  /**
   * Check if audio is currently playing
   */
  isAudioPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Get available voices
   */
  async getAvailableVoices(): Promise<Voice[]> {
    return customTTSService.getAvailableVoices();
  }

  /**
   * Get voices by language
   */
  getVoicesByLanguage(language: string): Voice[] {
    return customTTSService.getVoicesByLanguage(language);
  }

  /**
   * Get voices by gender
   */
  getVoicesByGender(gender: string): Voice[] {
    return customTTSService.getVoicesByGender(gender);
  }

  /**
   * Check TTS service health
   */
  async checkHealth(): Promise<{ healthy: boolean; details: any }> {
    return customTTSService.checkHealth();
  }

  /**
   * Test TTS functionality
   */
  async testTTS(voiceId: string = 'en-us-female-1'): Promise<boolean> {
    try {
      await this.speak('Hello, this is a test of the text-to-speech system.', voiceId);
      return true;
    } catch (error) {
      console.error('TTS test failed:', error);
      return false;
    }
  }

  /**
   * Get default ElevenLabs-style voice settings
   */
  getDefaultVoiceSettings(): VoiceSettings {
    return {
      speed: 1.0,
      stability: 0.6,
      similarity_boost: 0.7,
      use_speaker_boost: false
    };
  }

  /**
   * Get enhanced voice settings for better quality
   */
  getEnhancedVoiceSettings(): VoiceSettings {
    return {
      speed: 1.0,
      stability: 0.8, // Higher stability for better quality
      similarity_boost: 0.9, // Higher similarity for more natural voice
      use_speaker_boost: true // Enable speaker boost for clarity
    };
  }

  /**
   * Get fast voice settings for quick responses
   */
  getFastVoiceSettings(): VoiceSettings {
    return {
      speed: 1.2, // Slightly faster
      stability: 0.5, // Lower stability for speed
      similarity_boost: 0.6, // Lower similarity for speed
      use_speaker_boost: false // Disable for speed
    };
  }

  /**
   * Get voice settings optimized for conversation
   */
  getConversationVoiceSettings(): VoiceSettings {
    return {
      speed: 1.0,
      stability: 0.7, // Balanced stability
      similarity_boost: 0.8, // Good similarity
      use_speaker_boost: true // Enable for clarity
    };
  }
}

// Export singleton instance
export const textToSpeechService = new TextToSpeechService();

// Export for backward compatibility
export { AVAILABLE_VOICES };
export type { Voice };
