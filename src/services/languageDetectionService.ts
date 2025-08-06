
import { VOICE_LANGUAGE_MAP, AVAILABLE_VOICES } from './textToSpeechService';

export interface DetectedLanguage {
  language: string;
  confidence: number;
  suggestedVoiceId: string;
}

class LanguageDetectionService {
  private languagePatterns: Record<string, RegExp[]> = {
    'hi': [
      /[\u0900-\u097F]/g, // Devanagari script
      /\b(नमस्ते|धन्यवाद|कैसे|क्या|हां|नहीं)\b/gi
    ],
    'bn': [
      /[\u0980-\u09FF]/g, // Bengali script
      /\b(নমস্কার|ধন্যবাদ|কেমন|কি|হ্যাঁ|না)\b/gi
    ],
    'fr': [
      /\b(bonjour|merci|comment|que|oui|non|vive|la|france)\b/gi,
      /[àâäçéèêëïîôùûüÿ]/g
    ],
    'de': [
      /\b(hallo|danke|wie|was|ja|nein|gut|tag)\b/gi,
      /[äöüß]/g
    ],
    'es': [
      /\b(hola|gracias|cómo|qué|sí|no|buenos|días)\b/gi,
      /[áéíóúñ]/g
    ],
    'it': [
      /\b(ciao|grazie|come|che|sì|no|buon|giorno)\b/gi,
      /[àèéìíîòóù]/g
    ],
    'ta': [
      /[\u0B80-\u0BFF]/g, // Tamil script
      /\b(வணக்கம்|நன்றி|எப்படி|என்ன|ஆம்|இல்லை)\b/gi
    ],
    'te': [
      /[\u0C00-\u0C7F]/g, // Telugu script
      /\b(నమస్కారం|ధన్యవాదాలు|ఎలా|ఏమిటి|అవును|కాదు)\b/gi
    ],
    'ru': [
      /[\u0400-\u04FF]/g, // Cyrillic script
      /\b(привет|спасибо|как|что|да|нет)\b/gi
    ],
    'ja': [
      /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, // Hiragana, Katakana, Kanji
      /\b(こんにちは|ありがとう|どう|何|はい|いいえ)\b/gi
    ]
  };

  detectLanguage(text: string): DetectedLanguage {
    console.log('LanguageDetectionService: Detecting language for:', text.substring(0, 50));
    
    const scores: Record<string, number> = {};
    
    // Check each language pattern
    Object.entries(this.languagePatterns).forEach(([lang, patterns]) => {
      let score = 0;
      patterns.forEach(pattern => {
        const matches = text.match(pattern);
        if (matches) {
          score += matches.length;
        }
      });
      if (score > 0) {
        scores[lang] = score;
      }
    });

    // Find the language with highest score
    const detectedLang = Object.entries(scores).reduce((prev, curr) => 
      curr[1] > prev[1] ? curr : prev, ['en', 0])[0];

    // Find appropriate voice for detected language
    const suggestedVoice = AVAILABLE_VOICES.find(voice => 
      VOICE_LANGUAGE_MAP[voice.id] === detectedLang
    );

    const result: DetectedLanguage = {
      language: detectedLang,
      confidence: scores[detectedLang] || 0,
      suggestedVoiceId: suggestedVoice?.id || 'english_us_male'
    };

    console.log('LanguageDetectionService: Detected:', result);
    return result;
  }

  autoSelectVoiceForText(text: string): string {
    const detected = this.detectLanguage(text);
    
    // Only auto-switch if we have reasonable confidence
    if (detected.confidence > 0) {
      console.log('LanguageDetectionService: Auto-selecting voice:', detected.suggestedVoiceId);
      return detected.suggestedVoiceId;
    }
    
    return 'english_us_male'; // Default fallback
  }
}

export const languageDetectionService = new LanguageDetectionService();
