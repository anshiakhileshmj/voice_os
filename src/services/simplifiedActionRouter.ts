import { streamingTTSService } from './streamingTTSService';
import { languageAwareLLMService } from './languageAwareLLMService';
import { streamingLLMService } from './streamingLLMService';
import { spotifyService } from './spotifyService';
import { automateService } from './automateService';
import { languageDetectionService } from './languageDetectionService';

export interface ConversationCallbacks {
  onLLMChunk: (chunk: string) => void;
  onLLMComplete: (response: string) => void;
  onTTSStart: () => void;
  onTTSComplete: () => void;
  onError: (error: Error) => void;
}

export class SimplifiedActionRouter {
  private isAutomateEnabled = false;
  private currentResponse = '';
  private selectedVoiceId = 'english_us_male';
  private autoDetectLanguage = false;

  setAutomateEnabled(enabled: boolean) {
    this.isAutomateEnabled = enabled;
  }

  setSelectedVoice(voiceId: string) {
    this.selectedVoiceId = voiceId;
    console.log('SimplifiedActionRouter: Voice manually set to:', voiceId);
    console.log('SimplifiedActionRouter: Language for this voice:', streamingTTSService.getLanguageForVoice(voiceId));
  }

  setAutoDetectLanguage(enabled: boolean) {
    this.autoDetectLanguage = enabled;
    console.log('SimplifiedActionRouter: Auto language detection set to:', enabled);
  }

  getSelectedVoice(): string {
    return this.selectedVoiceId;
  }

  async processConversation(
    userInput: string,
    callbacks: ConversationCallbacks
  ): Promise<void> {
    if (!userInput.trim()) return;

    console.log('SimplifiedActionRouter: processConversation called with auto-detect:', this.autoDetectLanguage);
    
    // Determine voice to use
    let voiceToUse = this.selectedVoiceId;
    
    if (this.autoDetectLanguage) {
      const detectedVoice = languageDetectionService.autoSelectVoiceForText(userInput);
      console.log('SimplifiedActionRouter: Auto-detected voice:', detectedVoice);
      voiceToUse = detectedVoice;
      // Update selected voice to the detected one for this conversation
      this.selectedVoiceId = detectedVoice;
    }

    console.log('SimplifiedActionRouter: Processing conversation with voice:', voiceToUse);
    console.log('SimplifiedActionRouter: Voice language:', streamingTTSService.getLanguageForVoice(voiceToUse));

    try {
      // Quick check for specific actions before going to LLM
      const quickAction = await this.handleQuickActions(userInput);
      if (quickAction) {
        callbacks.onLLMComplete(quickAction.message);
        if (quickAction.speak) {
          this.handleTTS(quickAction.message, callbacks, voiceToUse);
        }
        return;
      }

      // Reset current response
      this.currentResponse = '';

      console.log('SimplifiedActionRouter: About to call languageAwareLLMService with voice:', voiceToUse);

      // Stream language-aware LLM response
      await languageAwareLLMService.generateLanguageAwareResponse(userInput, {
        voiceId: voiceToUse,
        onChunk: (chunk: string) => {
          this.currentResponse += chunk;
          callbacks.onLLMChunk(chunk);
        },
        onComplete: (fullResponse: string) => {
          this.currentResponse = fullResponse;
          callbacks.onLLMComplete(fullResponse);
          
          // Start TTS immediately after LLM completes
          this.handleTTS(fullResponse, callbacks, voiceToUse);
        },
        onError: callbacks.onError
      });

    } catch (error) {
      console.error('Conversation processing error:', error);
      callbacks.onError(error instanceof Error ? error : new Error('Unknown conversation error'));
    }
  }

  private async handleQuickActions(userInput: string): Promise<{message: string, speak: boolean} | null> {
    const input = userInput.toLowerCase();

    // Spotify commands
    if (input.includes('play') && (input.includes('song') || input.includes('music') || input.includes('spotify'))) {
      try {
        // Extract song name from input and search/play
        const songQuery = userInput.replace(/play|song|music|spotify/gi, '').trim();
        const track = await spotifyService.searchTrack(songQuery);
        if (track) {
          await spotifyService.playTrack(track.uri);
          return { message: `Playing ${track.name} by ${track.artist}`, speak: true };
        } else {
          return { message: "I couldn't find that song. Could you try again?", speak: true };
        }
      } catch (error) {
        return { message: "I had trouble playing that song. Could you try again?", speak: true };
      }
    }

    // Connect Spotify
    if (input.includes('connect spotify') || input.includes('spotify connect')) {
      try {
        await spotifyService.initiateAuth();
        return { message: "I'm redirecting you to connect your Spotify account.", speak: true };
      } catch (error) {
        return { message: "I had trouble connecting to Spotify. Please try again.", speak: true };
      }
    }

    // Automation commands (only if enabled)
    if (this.isAutomateEnabled) {
      if (input.includes('open') || input.includes('launch') || input.includes('start')) {
        try {
          const actions = await automateService.generateActions(`Open application: ${userInput}`);
          const result = await automateService.executeActions({
            actions,
            objective: `Open application: ${userInput}`
          });
          return { message: result.message, speak: true };
        } catch (error) {
          return { message: "I had trouble opening that application.", speak: true };
        }
      }

      if (input.includes('screenshot') || input.includes('capture screen')) {
        try {
          const actions = await automateService.generateActions('Take a screenshot');
          const result = await automateService.executeActions({
            actions,
            objective: 'Take a screenshot'
          });
          return { message: result.message, speak: true };
        } catch (error) {
          return { message: "I had trouble taking a screenshot.", speak: true };
        }
      }
    }

    return null;
  }

  private async handleTTS(text: string, callbacks: ConversationCallbacks, voiceId?: string) {
    const voiceToUse = voiceId || this.selectedVoiceId;
    console.log('SimplifiedActionRouter: handleTTS called');
    console.log('SimplifiedActionRouter: Starting TTS with voice:', voiceToUse);
    console.log('SimplifiedActionRouter: TTS voice language:', streamingTTSService.getLanguageForVoice(voiceToUse));
    callbacks.onTTSStart();
    
    await streamingTTSService.convertStreamingTextToSpeech(text, {
      voiceId: voiceToUse,
      rate: '0%',
      pitch: '0Hz',
      onComplete: () => {
        callbacks.onTTSComplete();
      },
      onError: callbacks.onError
    });
  }

  stopCurrentConversation() {
    streamingLLMService.stopStreaming();
    streamingTTSService.stopPlayback();
  }

  clearConversationHistory() {
    streamingLLMService.clearHistory();
  }
}

export const simplifiedActionRouter = new SimplifiedActionRouter();
