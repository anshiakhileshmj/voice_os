
import { streamingLLMService } from './streamingLLMService';
import { VOICE_LANGUAGE_MAP } from './textToSpeechService';

export interface LanguageAwareOptions {
  voiceId?: string;
  onChunk: (chunk: string) => void;
  onComplete: (response: string) => void;
  onError: (error: Error) => void;
}

class LanguageAwareLLMService {
  async generateLanguageAwareResponse(
    userInput: string,
    options: LanguageAwareOptions
  ): Promise<void> {
    const { voiceId = 'english_us_male', onChunk, onComplete, onError } = options;
    
    // Get language code from voice selection
    const languageCode = VOICE_LANGUAGE_MAP[voiceId] || 'en';
    
    console.log('LanguageAwareLLMService: Processing with voice:', voiceId);
    console.log('LanguageAwareLLMService: Language code:', languageCode);
    
    // Create language-specific system prompt
    const languagePrompt = this.getLanguagePrompt(languageCode);
    const enhancedInput = `${languagePrompt}\n\nUser: ${userInput}`;

    console.log('Generating response in language:', languageCode, 'for voice:', voiceId);

    try {
      await streamingLLMService.generateStreamingResponse(enhancedInput, {
        onChunk,
        onComplete,
        onError
      });
    } catch (error) {
      console.error('Language-aware LLM error:', error);
      onError(error instanceof Error ? error : new Error('Unknown LLM error'));
    }
  }

  private getLanguagePrompt(languageCode: string): string {
    const languagePrompts: Record<string, string> = {
      'en': 'Please respond in English.',
      'hi': 'कृपया हिंदी में जवाब दें। Please respond in Hindi language.',
      'bn': 'দয়া করে বাংলায় উত্তর দিন। Please respond in Bengali language.',
      'gu': 'કૃપા કરીને ગુજરાતીમાં જવાબ આપો। Please respond in Gujarati language.',
      'kn': 'ದಯವಿಟ್ಟು ಕನ್ನಡದಲ್ಲಿ ಉತ್ತರಿಸಿ। Please respond in Kannada language.',
      'ml': 'ദയവായി മലയാളത്തിൽ ഉത്തരം നൽകുക। Please respond in Malayalam language.',
      'mr': 'कृपया मराठीत उत्तर द्या। Please respond in Marathi language.',
      'pa': 'ਕਿਰਪਾ ਕਰਕੇ ਪੰਜਾਬੀ ਵਿੱਚ ਜਵਾਬ ਦਿਓ। Please respond in Punjabi language.',
      'ta': 'தயவுசெய்து தமிழில் பதிலளிக்கவும்। Please respond in Tamil language.',
      'te': 'దయచేసి తెలుగులో సమాధానం ఇవ్వండి। Please respond in Telugu language.',
      'de': 'Bitte antworten Sie auf Deutsch. Please respond in German language.',
      'fr': 'Veuillez répondre en français. Please respond in French language.',
      'es': 'Por favor responde en español. Please respond in Spanish language.',
      'it': 'Per favore rispondi in italiano. Please respond in Italian language.',
      'pt': 'Por favor, responda em português. Please respond in Portuguese language.',
      'ru': 'Пожалуйста, отвечайте на русском языке. Please respond in Russian language.',
      'ja': '日本語で答えてください。Please respond in Japanese language.',
    };

    return languagePrompts[languageCode] || languagePrompts['en'];
  }
}

export const languageAwareLLMService = new LanguageAwareLLMService();
