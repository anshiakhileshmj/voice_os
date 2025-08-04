
import { consolidatedTTSService, TTSVoiceSettings } from './consolidatedTTSService';

export interface Voice {
  id: string;
  name: string;
  language: string;
  gender: string;
}

export const AVAILABLE_VOICES: Voice[] = [
  { id: 'en-us-female-1', name: 'Female (US)', language: 'en', gender: 'female' },
  { id: 'en-us-male-1', name: 'Male (US)', language: 'en', gender: 'male' },
  { id: 'en-uk-female-1', name: 'Female (UK)', language: 'en', gender: 'female' },
  { id: 'en-uk-male-1', name: 'Male (UK)', language: 'en', gender: 'male' },
  { id: 'hi-female-1', name: 'Female (Hindi)', language: 'hi', gender: 'female' },
  { id: 'hi-male-1', name: 'Male (Hindi)', language: 'hi', gender: 'male' },
  { id: 'de-female-1', name: 'Female (German)', language: 'de', gender: 'female' },
  { id: 'de-male-1', name: 'Male (German)', language: 'de', gender: 'male' },
  { id: 'fr-female-1', name: 'Female (French)', language: 'fr', gender: 'female' },
  { id: 'fr-male-1', name: 'Male (French)', language: 'fr', gender: 'male' },
];

export class TextToSpeechService {
  private static instance: TextToSpeechService;

  private constructor() {}

  static getInstance(): TextToSpeechService {
    if (!TextToSpeechService.instance) {
      TextToSpeechService.instance = new TextToSpeechService();
    }
    return TextToSpeechService.instance;
  }

  async convertTextToSpeech(
    text: string, 
    voiceId: string = 'en-us-female-1',
    voiceSettings?: TTSVoiceSettings
  ): Promise<ArrayBuffer> {
    const result = await consolidatedTTSService.convertTextToSpeech(text, voiceId, voiceSettings);
    return await result.audioBlob.arrayBuffer();
  }

  async convertAndPlay(
    text: string,
    voiceId: string = 'en-us-female-1',
    voiceSettings?: TTSVoiceSettings
  ): Promise<void> {
    const result = await consolidatedTTSService.convertTextToSpeech(text, voiceId, voiceSettings);
    await consolidatedTTSService.playAudio(result.audioBlob);
  }

  async playAudio(audioBuffer: ArrayBuffer): Promise<void> {
    const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
    await consolidatedTTSService.playAudio(blob);
  }

  getAvailableVoices(): Voice[] {
    return AVAILABLE_VOICES;
  }

  getDefaultVoiceSettings(): TTSVoiceSettings {
    return consolidatedTTSService.getDefaultVoiceSettings();
  }

  isConfigured(): boolean {
    return true; // Always configured with multiple fallbacks
  }
}

export const textToSpeechService = TextToSpeechService.getInstance();
