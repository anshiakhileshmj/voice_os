
import franc from 'franc';
import { VOICE_LANGUAGE_MAP, AVAILABLE_VOICES } from './textToSpeechService';

export interface DetectedLanguage {
  language: string;
  confidence: number;
  suggestedVoiceId: string;
}

// Map franc language codes to our supported languages
const FRANC_TO_OUR_LANG_MAP: Record<string, string> = {
  'eng': 'en',
  'hin': 'hi',
  'ben': 'bn',
  'guj': 'gu',
  'kan': 'kn',
  'mal': 'ml',
  'mar': 'mr',
  'pan': 'pa',
  'tam': 'ta',
  'tel': 'te',
  'deu': 'de',
  'fra': 'fr',
  'spa': 'es',
  'ita': 'it',
  'por': 'pt',
  'rus': 'ru',
  'jpn': 'ja'
};

class LanguageDetectionService {
  private isDetectionEnabled = false;

  enableDetection() {
    this.isDetectionEnabled = true;
    console.log('LanguageDetectionService: Auto-detection enabled');
  }

  disableDetection() {
    this.isDetectionEnabled = false;
    console.log('LanguageDetectionService: Auto-detection disabled');
  }

  detectLanguage(text: string): DetectedLanguage {
    console.log('LanguageDetectionService: Detecting language for:', text.substring(0, 50));
    
    if (!this.isDetectionEnabled) {
      return {
        language: 'en',
        confidence: 0,
        suggestedVoiceId: 'english_us_male'
      };
    }

    // Use franc for language detection
    const francResult = franc(text);
    console.log('LanguageDetectionService: Franc detected:', francResult);
    
    // Map franc result to our language codes
    const detectedLang = FRANC_TO_OUR_LANG_MAP[francResult] || 'en';
    
    // Calculate confidence based on text length and franc certainty
    let confidence = text.length > 10 ? 0.8 : 0.5;
    if (francResult === 'und') { // undefined language
      confidence = 0;
    }

    // Find appropriate voice for detected language
    const suggestedVoice = AVAILABLE_VOICES.find(voice => 
      VOICE_LANGUAGE_MAP[voice.id] === detectedLang
    );

    const result: DetectedLanguage = {
      language: detectedLang,
      confidence,
      suggestedVoiceId: suggestedVoice?.id || 'english_us_male'
    };

    console.log('LanguageDetectionService: Final detection result:', result);
    return result;
  }

  autoSelectVoiceForText(text: string): string {
    if (!this.isDetectionEnabled) {
      return 'english_us_male';
    }

    const detected = this.detectLanguage(text);
    
    // Only auto-switch if we have reasonable confidence
    if (detected.confidence > 0.6) {
      console.log('LanguageDetectionService: Auto-selecting voice:', detected.suggestedVoiceId);
      return detected.suggestedVoiceId;
    }
    
    return 'english_us_male'; // Default fallback
  }
}

export const languageDetectionService = new LanguageDetectionService();
