import { toast } from '@/hooks/use-toast';

// Enhanced Custom TTS Service with fallback and retry logic
// Replaces ElevenLabs with instant, reliable multilingual TTS

export interface Voice {
  id: string;
  name: string;
  language: string;
  gender: string;
  accent?: string;
  primary_model: string;
  fallback_model: string;
  edge_voice?: string;
  gtts_lang?: string;
}

export interface TTSRequest {
  text: string;
  voice_id: string;
  language: string;
  speed: number;
  use_fallback: boolean;
  // ElevenLabs-style voice settings
  stability: number;
  similarity_boost: number;
  use_speaker_boost: boolean;
}

export interface TTSResponse {
  success: boolean;
  message: string;
  model_used?: string;
}

// Available voices configuration
export const AVAILABLE_VOICES: Voice[] = [
  {
    id: 'en-us-female-1',
    name: 'Female (EN-US)',
    language: 'en',
    gender: 'female',
    accent: 'us',
    primary_model: 'edge-tts',
    fallback_model: 'gtts',
    edge_voice: 'en-US-AriaNeural',
    gtts_lang: 'en'
  },
  {
    id: 'en-us-male-1',
    name: 'Male (EN-US)',
    language: 'en',
    gender: 'male',
    accent: 'us',
    primary_model: 'edge-tts',
    fallback_model: 'gtts',
    edge_voice: 'en-US-GuyNeural',
    gtts_lang: 'en'
  },
  {
    id: 'en-uk-female-1',
    name: 'Female (EN-UK)',
    language: 'en',
    gender: 'female',
    accent: 'uk',
    primary_model: 'edge-tts',
    fallback_model: 'gtts',
    edge_voice: 'en-GB-SoniaNeural',
    gtts_lang: 'en'
  },
  {
    id: 'en-uk-male-1',
    name: 'Male (EN-UK)',
    language: 'en',
    gender: 'male',
    accent: 'uk',
    primary_model: 'edge-tts',
    fallback_model: 'gtts',
    edge_voice: 'en-GB-RyanNeural',
    gtts_lang: 'en'
  },
  {
    id: 'hi-female-1',
    name: 'Female (Hindi)',
    language: 'hi',
    gender: 'female',
    primary_model: 'edge-tts',
    fallback_model: 'gtts',
    edge_voice: 'hi-IN-SwaraNeural',
    gtts_lang: 'hi'
  },
  {
    id: 'hi-male-1',
    name: 'Male (Hindi)',
    language: 'hi',
    gender: 'male',
    primary_model: 'edge-tts',
    fallback_model: 'gtts',
    edge_voice: 'hi-IN-MadhurNeural',
    gtts_lang: 'hi'
  },
  {
    id: 'de-female-1',
    name: 'Female (German)',
    language: 'de',
    gender: 'female',
    primary_model: 'edge-tts',
    fallback_model: 'gtts',
    edge_voice: 'de-DE-KatjaNeural',
    gtts_lang: 'de'
  },
  {
    id: 'de-male-1',
    name: 'Male (German)',
    language: 'de',
    gender: 'male',
    primary_model: 'edge-tts',
    fallback_model: 'gtts',
    edge_voice: 'de-DE-ConradNeural',
    gtts_lang: 'de'
  },
  {
    id: 'fr-female-1',
    name: 'Female (French)',
    language: 'fr',
    gender: 'female',
    primary_model: 'edge-tts',
    fallback_model: 'gtts',
    edge_voice: 'fr-FR-DeniseNeural',
    gtts_lang: 'fr'
  },
  {
    id: 'fr-male-1',
    name: 'Male (French)',
    language: 'fr',
    gender: 'male',
    primary_model: 'edge-tts',
    fallback_model: 'gtts',
    edge_voice: 'fr-FR-HenriNeural',
    gtts_lang: 'fr'
  }
];

// TTS API Configuration
const TTS_API_BASE_URL = 'http://localhost:8001';

// Enhanced TTS Service with retry logic and ElevenLabs-style settings
export class CustomTTSService {
  private static instance: CustomTTSService;
  private retryCount = 3;
  private retryDelay = 1000; // 1 second

  private constructor() {}

  static getInstance(): CustomTTSService {
    if (!CustomTTSService.instance) {
      CustomTTSService.instance = new CustomTTSService();
    }
    return CustomTTSService.instance;
  }

  /**
   * Convert text to speech with automatic fallback and ElevenLabs-style settings
   */
  async convertTextToSpeech(
    text: string,
    voiceId: string = 'en-us-female-1',
    useFallback: boolean = true,
    voiceSettings?: {
      speed?: number;
      stability?: number;
      similarity_boost?: number;
      use_speaker_boost?: boolean;
    }
  ): Promise<{ audioBlob: Blob; modelUsed: string }> {
    
    const request: TTSRequest = {
      text,
      voice_id: voiceId,
      language: 'en',
      use_fallback: useFallback,
      speed: voiceSettings?.speed || 1.0,
      stability: voiceSettings?.stability || 0.6,
      similarity_boost: voiceSettings?.similarity_boost || 0.7,
      use_speaker_boost: voiceSettings?.use_speaker_boost || false
    };

    // Try the main endpoint first (with automatic fallback)
    try {
      const response = await this.makeRequest('/api/tts/generate', request);
      
      return {
        audioBlob: response,
        modelUsed: 'edge-tts' // Default to edge-tts for main endpoint
      };
    } catch (error) {
      console.warn('Main TTS endpoint failed, trying direct endpoints:', error);
      
      // Fallback to direct endpoints
      return await this.tryDirectEndpoints(text, voiceId, voiceSettings);
    }
  }

  /**
   * Try direct endpoints as fallback
   */
  private async tryDirectEndpoints(
    text: string,
    voiceId: string,
    voiceSettings?: {
      speed?: number;
      stability?: number;
      similarity_boost?: number;
      use_speaker_boost?: boolean;
    }
  ): Promise<{ audioBlob: Blob; modelUsed: string }> {
    
    const request: TTSRequest = {
      text,
      voice_id: voiceId,
      language: 'en',
      use_fallback: true,
      speed: voiceSettings?.speed || 1.0,
      stability: voiceSettings?.stability || 0.6,
      similarity_boost: voiceSettings?.similarity_boost || 0.7,
      use_speaker_boost: voiceSettings?.use_speaker_boost || false
    };

    // Try Edge TTS first
    try {
      const response = await this.makeRequest('/api/tts/edge', request);
      return {
        audioBlob: response,
        modelUsed: 'edge-tts'
      };
    } catch (error) {
      console.warn('Edge TTS failed, trying Google TTS:', error);
      
      // Try Google TTS as final fallback
      try {
        const response = await this.makeRequest('/api/tts/gtts', request);
        return {
          audioBlob: response,
          modelUsed: 'gtts'
        };
      } catch (gttsError) {
        throw new Error(`All TTS methods failed: Edge TTS: ${error}, Google TTS: ${gttsError}`);
      }
    }
  }

  /**
   * Make HTTP request with retry logic
   */
  private async makeRequest(endpoint: string, request: TTSRequest): Promise<Blob> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.retryCount; attempt++) {
      try {
        const response = await fetch(`${TTS_API_BASE_URL}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.blob();
        
      } catch (error) {
        lastError = error as Error;
        console.warn(`TTS request attempt ${attempt} failed:`, error);
        
        if (attempt < this.retryCount) {
          await this.delay(this.retryDelay);
        }
      }
    }

    throw lastError || new Error('TTS request failed after all retries');
  }

  /**
   * Get available voices
   */
  async getAvailableVoices(): Promise<Voice[]> {
    try {
      const response = await fetch(`${TTS_API_BASE_URL}/api/tts/voices`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.voices || AVAILABLE_VOICES;
    } catch (error) {
      console.warn('Failed to fetch voices from API, using default:', error);
      return AVAILABLE_VOICES;
    }
  }

  /**
   * Check TTS service health
   */
  async checkHealth(): Promise<{ healthy: boolean; details: any }> {
    try {
      const response = await fetch(`${TTS_API_BASE_URL}/api/tts/health`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return {
        healthy: data.status === 'healthy',
        details: data
      };
    } catch (error) {
      return {
        healthy: false,
        details: { error: error.message }
      };
    }
  }

  /**
   * Filter voices by language and gender
   */
  filterVoices(voices: Voice[], language?: string, gender?: string): Voice[] {
    return voices.filter(voice => {
      if (language && voice.language !== language) return false;
      if (gender && voice.gender !== gender) return false;
      return true;
    });
  }

  /**
   * Get voices by language
   */
  getVoicesByLanguage(language: string): Voice[] {
    return AVAILABLE_VOICES.filter(voice => voice.language === language);
  }

  /**
   * Get voices by gender
   */
  getVoicesByGender(gender: string): Voice[] {
    return AVAILABLE_VOICES.filter(voice => voice.gender === gender);
  }

  /**
   * Get default ElevenLabs-style voice settings
   */
  getDefaultVoiceSettings() {
    return {
      speed: 1.0,
      stability: 0.6,
      similarity_boost: 0.7,
      use_speaker_boost: false
    };
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const customTTSService = CustomTTSService.getInstance();

// Legacy function for backward compatibility
export const convertTextToSpeech = async (
  text: string,
  voiceId: string = 'en-us-female-1',
  voiceSettings?: {
    speed?: number;
    stability?: number;
    similarity_boost?: number;
    use_speaker_boost?: boolean;
  }
): Promise<{ audioBlob: Blob; modelUsed: string }> => {
  return customTTSService.convertTextToSpeech(text, voiceId, true, voiceSettings);
}; 