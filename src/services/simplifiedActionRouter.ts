import { streamingTTSService } from './streamingTTSService';
import { languageAwareLLMService } from './languageAwareLLMService';
import { streamingLLMService } from './streamingLLMService';
import { spotifyService } from './spotifyService';
import { automateService } from './automateService';

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
  private selectedVoiceId = 'english_us_male'; // Fixed to English US Male

  setAutomateEnabled(enabled: boolean) {
    this.isAutomateEnabled = enabled;
  }

  setSelectedVoice(voiceId: string) {
    // Voice is now fixed to english_us_male, but keeping method for compatibility
    this.selectedVoiceId = 'english_us_male';
    console.log('Voice is permanently set to:', this.selectedVoiceId);
  }

  async processConversation(
    userInput: string,
    callbacks: ConversationCallbacks
  ): Promise<void> {
    if (!userInput.trim()) return;

    try {
      // Quick check for specific actions before going to LLM
      const quickAction = await this.handleQuickActions(userInput);
      if (quickAction) {
        callbacks.onLLMComplete(quickAction.message);
        if (quickAction.speak) {
          this.handleTTS(quickAction.message, callbacks);
        }
        return;
      }

      // Reset current response
      this.currentResponse = '';

      // Stream language-aware LLM response
      await languageAwareLLMService.generateLanguageAwareResponse(userInput, {
        voiceId: this.selectedVoiceId,
        onChunk: (chunk: string) => {
          this.currentResponse += chunk;
          callbacks.onLLMChunk(chunk);
        },
        onComplete: (fullResponse: string) => {
          this.currentResponse = fullResponse;
          callbacks.onLLMComplete(fullResponse);
          
          // Start TTS immediately after LLM completes
          this.handleTTS(fullResponse, callbacks);
        },
        onError: callbacks.onError
      });

    } catch (error) {
      console.error('Conversation processing error:', error);
      callbacks.onError(error instanceof Error ? error : new Error('Unknown conversation error'));
    }
  }

  private async handleQuickActions(userInput: string): Promise<{message: string, speak: boolean, data?: any} | null> {
    const input = userInput.toLowerCase();

    // Spotify commands
    if (input.includes('play') && (input.includes('song') || input.includes('music') || input.includes('spotify'))) {
      try {
        // Extract song name from input and search/play
        const songQuery = userInput.replace(/play|song|music|spotify/gi, '').trim();
        const track = await spotifyService.searchTrack(songQuery);
        
        if (!track) {
          return { message: "I couldn't find that song. Could you try again?", speak: true };
        }

        const playResult = await spotifyService.playTrack(track.uri);
        
        if (!playResult.success) {
          switch (playResult.error) {
            case 'premium_required':
              return { 
                message: "Spotify Premium is required to control playback. Please upgrade your Spotify account.", 
                speak: true,
                data: { showPremiumPopup: true }
              };
            case 'no_devices':
              return { 
                message: "No Spotify devices found. Please open Spotify on a device first.", 
                speak: true 
              };
            case 'no_active_device':
              return { 
                message: "No active Spotify device found. Please start playing something on Spotify first.", 
                speak: true 
              };
            default:
              return { 
                message: "I had trouble playing that song. Could you try again?", 
                speak: true 
              };
          }
        }

        return { message: `Playing ${track.name} by ${track.artist}`, speak: true };
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

  private async handleTTS(text: string, callbacks: ConversationCallbacks) {
    callbacks.onTTSStart();
    
    await streamingTTSService.convertStreamingTextToSpeech(text, {
      voiceId: this.selectedVoiceId,
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
