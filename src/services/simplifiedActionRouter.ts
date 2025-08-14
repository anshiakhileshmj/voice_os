
import { streamingTTSService } from './streamingTTSService';
import { languageAwareLLMService } from './languageAwareLLMService';
import { streamingLLMService } from './streamingLLMService';
import { spotifyService } from './spotifyService';
import { spotifyWebPlaybackService } from './spotifyWebPlaybackService';
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
  private selectedVoiceId = 'english_us_male';

  setAutomateEnabled(enabled: boolean) {
    this.isAutomateEnabled = enabled;
  }

  setSelectedVoice(voiceId: string) {
    this.selectedVoiceId = 'english_us_male';
    console.log('Voice is permanently set to:', this.selectedVoiceId);
  }

  async processConversation(
    userInput: string,
    callbacks: ConversationCallbacks
  ): Promise<void> {
    if (!userInput.trim()) return;

    try {
      const quickAction = await this.handleQuickActions(userInput);
      if (quickAction) {
        callbacks.onLLMComplete(quickAction.message);
        if (quickAction.speak) {
          this.handleTTS(quickAction.message, callbacks);
        }
        return;
      }

      this.currentResponse = '';

      // Only enhance with Spotify context if user is asking Spotify-related questions
      const enhancedInput = await this.enhanceWithSpotifyContext(userInput);

      await languageAwareLLMService.generateLanguageAwareResponse(enhancedInput, {
        voiceId: this.selectedVoiceId,
        onChunk: (chunk: string) => {
          this.currentResponse += chunk;
          callbacks.onLLMChunk(chunk);
        },
        onComplete: (fullResponse: string) => {
          this.currentResponse = fullResponse;
          callbacks.onLLMComplete(fullResponse);
          
          this.handleTTS(fullResponse, callbacks);
        },
        onError: callbacks.onError
      });

    } catch (error) {
      console.error('Conversation processing error:', error);
      callbacks.onError(error instanceof Error ? error : new Error('Unknown conversation error'));
    }
  }

  private async enhanceWithSpotifyContext(userInput: string): Promise<string> {
    try {
      const spotifyInfo = await spotifyService.getDetailedSpotifyInfo();
      
      if (!spotifyInfo.isConnected) {
        return userInput;
      }

      const input = userInput.toLowerCase();
      
      // More specific detection - only inject context for explicit Spotify queries
      const spotifyKeywords = [
        'spotify', 'playlist', 'music', 'song', 'track', 'artist', 'album',
        'premium', 'subscription', 'account', 'play ', 'playing', 'listen'
      ];
      
      const isSpotifyRelated = spotifyKeywords.some(keyword => input.includes(keyword));
      
      // Also check for questions about user's data that might relate to Spotify
      const personalDataKeywords = ['my name', 'who am i', 'my account', 'my profile'];
      const isPersonalDataQuery = personalDataKeywords.some(keyword => input.includes(keyword));
      
      if (isSpotifyRelated || isPersonalDataQuery) {
        let context = `User's Spotify Account Information:\n`;
        
        if (spotifyInfo.profile) {
          context += `- Name: ${spotifyInfo.profile.display_name || 'Not available'}\n`;
          context += `- Email: ${spotifyInfo.profile.email || 'Not available'}\n`;
          context += `- Country: ${spotifyInfo.profile.country || 'Not available'}\n`;
          context += `- Account Type: ${spotifyInfo.profile.product || 'free'} (${spotifyInfo.subscription?.isPremium ? 'Premium subscriber' : 'Free user'})\n`;
          context += `- Followers: ${spotifyInfo.profile.followers_total || 0}\n`;
        }
        
        if (spotifyInfo.playlists.length > 0) {
          context += `- Total Playlists: ${spotifyInfo.playlists.length}\n`;
          context += `- Playlist Names: ${spotifyInfo.playlists.slice(0, 10).map(p => p.name).join(', ')}${spotifyInfo.playlists.length > 10 ? '...' : ''}\n`;
          const ownedPlaylists = spotifyInfo.playlists.filter(p => p.owner?.id === spotifyInfo.profile?.id);
          context += `- Owned Playlists: ${ownedPlaylists.length}\n`;
          const publicPlaylists = spotifyInfo.playlists.filter(p => p.public);
          context += `- Public Playlists: ${publicPlaylists.length}\n`;
        }
        
        if (spotifyInfo.artists.length > 0) {
          context += `- Top Artists (${spotifyInfo.artists.length}): ${spotifyInfo.artists.slice(0, 8).map(a => a.name).join(', ')}\n`;
          const genres = [...new Set(spotifyInfo.artists.flatMap(a => a.genres || []))];
          context += `- Favorite Genres: ${genres.slice(0, 5).join(', ')}\n`;
        }
        
        if (spotifyInfo.tracks.length > 0) {
          context += `- Top Tracks (${spotifyInfo.tracks.length}): ${spotifyInfo.tracks.slice(0, 8).map(t => `"${t.name}" by ${t.artists?.[0]?.name || 'Unknown'}`).join(', ')}\n`;
        }
        
        if (spotifyInfo.devices.length > 0) {
          context += `- Available Devices: ${spotifyInfo.devices.map(d => `${d.name} (${d.type})`).join(', ')}\n`;
          const activeDevice = spotifyInfo.devices.find(d => d.is_active);
          if (activeDevice) {
            context += `- Currently Active Device: ${activeDevice.name}\n`;
          }
        }

        if (!spotifyInfo.subscription?.isPremium) {
          context += `- Note: User has free Spotify account, so playback control is limited\n`;
        }
        
        return `${context}\nUser Question: ${userInput}`;
      }
      
      return userInput;
    } catch (error) {
      console.error('Error enhancing with Spotify context:', error);
      return userInput;
    }
  }

  private async handleQuickActions(userInput: string): Promise<{message: string, speak: boolean, data?: any} | null> {
    const input = userInput.toLowerCase();

    // Handle disconnect Spotify - improved pattern matching
    if (input.includes('disconnect spotify') || 
        input.includes('unlink spotify') || 
        input.includes('remove spotify') ||
        input.includes('disconnect my spotify') ||
        (input.includes('disconnect') && input.includes('spotify'))) {
      try {
        const isConnected = await spotifyService.isConnected();
        if (!isConnected) {
          return { message: "Your Spotify account is not currently connected.", speak: true };
        }

        await spotifyService.disconnect();
        return { message: "I've successfully disconnected your Spotify account. You can reconnect anytime by clicking the Spotify button.", speak: true };
      } catch (error) {
        console.error('Disconnect error:', error);
        return { message: "I had trouble disconnecting your Spotify account. Please try again.", speak: true };
      }
    }

    // Spotify commands
    if (input.includes('play') && (input.includes('song') || input.includes('music') || input.includes('spotify'))) {
      try {
        const songQuery = userInput.replace(/play|song|music|spotify/gi, '').trim();
        const track = await spotifyService.searchTrack(songQuery);
        
        if (!track) {
          return { message: "I couldn't find that song. Could you try again?", speak: true };
        }

        // Try to use Web Playback SDK first if available
        const profile = await spotifyService.getUserProfile();
        if (profile.product === 'premium') {
          try {
            await spotifyWebPlaybackService.initializePlayer();
            const webPlayResult = await spotifyWebPlaybackService.playTrack(track.uri);
            
            if (webPlayResult.success) {
              return { message: `Playing ${track.name} by ${track.artist} on your browser`, speak: true };
            }
          } catch (error) {
            console.log('Web playback failed, falling back to regular API:', error);
          }
        }

        // Fallback to regular Spotify API
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
