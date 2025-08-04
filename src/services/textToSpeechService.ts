
import { consolidatedTTSService, TTSVoiceSettings } from './consolidatedTTSService';

export interface Voice {
  id: string;
  name: string;
  language: string;
  gender: string;
}

export const AVAILABLE_VOICES: Voice[] = [
  { id: 'female-en-us', name: 'Female (US)', language: 'en', gender: 'female' },
  { id: 'male-en-us', name: 'Male (US)', language: 'en', gender: 'male' },
  { id: 'female-en-uk', name: 'Female (UK)', language: 'en', gender: 'female' },
  { id: 'male-en-uk', name: 'Male (UK)', language: 'en', gender: 'male' },
  { id: 'female-hindi', name: 'Female (Hindi)', language: 'hi', gender: 'female' },
  { id: 'male-hindi', name: 'Male (Hindi)', language: 'hi', gender: 'male' },
  { id: 'female-german', name: 'Female (German)', language: 'de', gender: 'female' },
  { id: 'male-german', name: 'Male (German)', language: 'de', gender: 'male' },
  { id: 'female-french', name: 'Female (French)', language: 'fr', gender: 'female' },
  { id: 'male-french', name: 'Male (French)', language: 'fr', gender: 'male' },
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
    voiceId: string = 'female-en-us',
    voiceSettings?: TTSVoiceSettings
  ): Promise<ArrayBuffer> {
    const result = await consolidatedTTSService.convertTextToSpeech(text, voiceId, voiceSettings);
    return await result.audioBlob.arrayBuffer();
  }

  async convertAndPlay(
    text: string,
    voiceId: string = 'female-en-us',
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
    return true; // Always configured with custom TTS
  }
}

export const textToSpeechService = TextToSpeechService.getInstance();
