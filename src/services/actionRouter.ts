import { spotifyService } from './spotifyService';
import { spotifyWebPlaybackService } from './spotifyWebPlaybackService';
import { llmService, ConversationMessage } from './llmService';
import { locationService } from './locationService';
import { documentService } from './documentService';
import { automateService, AutomateAction } from './automateService';
import { subscriptionService } from './subscriptionService';
import { supabase } from '@/integrations/supabase/client';

export interface IntentResult {
  intent: string;
  confidence: number;
  params?: Record<string, any>;
  response?: string;
}

export interface ActionResult {
  success: boolean;
  message: string;
  requiresTTS?: boolean;
  data?: any;
}

export class ActionRouter {
  async processUserInput(
    userInput: string,
    conversationHistory: ConversationMessage[],
    isAutomateEnabled: boolean = true
  ): Promise<{ intent: IntentResult; actionResult?: ActionResult; llmResponse?: string }> {
    
    const intent = await this.detectIntent(userInput, conversationHistory, isAutomateEnabled);
    
    let actionResult: ActionResult | undefined;
    let llmResponse: string | undefined;

    switch (intent.intent) {
      case 'automate_action':
        actionResult = await this.handleAutomateAction(intent.params);
        break;
        
      case 'connect_spotify':
        actionResult = await this.handleSpotifyConnect();
        break;
        
      case 'play_song':
        actionResult = await this.handlePlaySong(intent.params);
        break;
        
      case 'check_spotify_status':
        actionResult = await this.handleSpotifyStatus();
        break;

      case 'startup_greeting':
        actionResult = await this.handleStartupGreeting();
        break;

      case 'location_query':
        actionResult = await this.handleLocationQuery(intent.params);
        break;

      case 'document_capabilities':
        actionResult = await this.handleDocumentCapabilities();
        break;

      case 'document_processing':
        actionResult = await this.handleDocumentProcessing(intent.params);
        break;
        
      case 'conversation':
      default:
        // Enhance conversation with Spotify context
        const enhancedInput = await this.enhanceWithSpotifyContext(userInput);
        const { response } = await llmService.generateResponse(enhancedInput, conversationHistory);
        llmResponse = response;
        
        await this.storeConversationHistory(userInput, intent.intent, response);
        break;
    }

    return { intent, actionResult, llmResponse };
  }

  private async enhanceWithSpotifyContext(userInput: string): Promise<string> {
    try {
      const isConnected = await spotifyService.isConnected();
      if (!isConnected) {
        return userInput;
      }

      const input = userInput.toLowerCase();
      
      if (input.includes('my name') || input.includes('spotify') || 
          input.includes('playlist') || input.includes('favorite') || 
          input.includes('top') || input.includes('music')) {
        
        const spotifyData = await spotifyService.getStoredSpotifyData();
        
        let context = `User's Spotify Information:\n`;
        
        if (spotifyData.profile) {
          context += `- Name: ${spotifyData.profile.display_name || 'Not available'}\n`;
          context += `- Country: ${spotifyData.profile.country || 'Not available'}\n`;
          context += `- Account Type: ${spotifyData.profile.product || 'Not available'}\n`;
        }
        
        if (spotifyData.playlists.length > 0) {
          context += `- Playlists (${spotifyData.playlists.length}): ${spotifyData.playlists.slice(0, 5).map(p => p.name).join(', ')}\n`;
        }
        
        if (spotifyData.artists.length > 0) {
          context += `- Top Artists: ${spotifyData.artists.slice(0, 5).map(a => a.name).join(', ')}\n`;
        }
        
        if (spotifyData.tracks.length > 0) {
          context += `- Top Tracks: ${spotifyData.tracks.slice(0, 5).map(t => `${t.name} by ${t.artist_names}`).join(', ')}\n`;
        }
        
        return `${context}\nUser Question: ${userInput}`;
      }
      
      return userInput;
    } catch (error) {
      console.error('Error enhancing with Spotify context:', error);
      return userInput;
    }
  }

  private async detectIntent(
    userInput: string,
    conversationHistory: ConversationMessage[],
    isAutomateEnabled: boolean
  ): Promise<IntentResult> {
    const automateIntentText = isAutomateEnabled 
      ? ', "automate_action": detect requests to automate computer tasks like "open google", "open notepad", "launch calculator", "start word", "take a screenshot", "close window", "type text", "move mouse", "click button", etc.'
      : '';

    const systemPrompt = `You are an intent detection system. Analyze the user's input and respond with a JSON object containing:
- intent: one of ["connect_spotify", "play_song", "check_spotify_status", "startup_greeting", "location_query", "document_capabilities", "document_processing", "automate_action", "conversation"]  
- confidence: number between 0-1
- params: object with extracted parameters
- response: brief response if action needed

Intent definitions:
- "startup_greeting": app startup or first interaction
- "location_query": asking about city, region, country, time, weather, or location info
- "document_capabilities": asking what can be done with documents or file processing
- "document_processing": commands to summarize, extract, format documents, ask questions about files, or document-related requests
- "play_song": extract artist and song from phrases like "play [song] by [artist]", "play [artist]", etc.
- "connect_spotify": detect requests to connect/link/authorize Spotify
- "check_spotify_status": detect requests about Spotify connection status${automateIntentText}
- "automate_action": detect requests to automate computer tasks (e.g., open apps, control windows, type, click, etc.). For these, extract the user's objective as 'objective' in params. The automation backend expects clear, actionable objectives and will generate JSON instructions for the Python automation system under the 'os' directory.
- "conversation": everything else

Examples:
- "hello" → {"intent":"startup_greeting","confidence":0.9}
- "what time is it" → {"intent":"location_query","confidence":0.9,"params":{"query_type":"time"}}
- "what's my location" → {"intent":"location_query","confidence":0.95,"params":{"query_type":"location"}}  
- "can you process documents" → {"intent":"document_capabilities","confidence":0.9}
- "summarize this file" → {"intent":"document_processing","confidence":0.9,"params":{"action":"summarize"}}
- "summarize the pdf" → {"intent":"document_processing","confidence":0.95,"params":{"action":"summarize"}}
- "extract text from document" → {"intent":"document_processing","confidence":0.9,"params":{"action":"extract"}}
- "format my document" → {"intent":"document_processing","confidence":0.9,"params":{"action":"format"}}
- "question about the document" → {"intent":"document_processing","confidence":0.9,"params":{"action":"question"}}
- "summarize (document: doc-123)" → {"intent":"document_processing","confidence":0.95,"params":{"action":"summarize","documentId":"doc-123"}}
- "play bohemian rhapsody by queen" → {"intent":"play_song","confidence":0.95,"params":{"artist":"queen","song":"bohemian rhapsody"}}
- "connect my spotify" → {"intent":"connect_spotify","confidence":0.9}
- "open notepad" → {"intent":"automate_action","confidence":0.95,"params":{"objective":"open notepad"}}
- "launch calculator" → {"intent":"automate_action","confidence":0.95,"params":{"objective":"launch calculator"}}
- "start word" → {"intent":"automate_action","confidence":0.95,"params":{"objective":"start word"}}
- "take a screenshot" → {"intent":"automate_action","confidence":0.95,"params":{"objective":"take a screenshot"}}
- "close window" → {"intent":"automate_action","confidence":0.95,"params":{"objective":"close window"}}
- "type hello world" → {"intent":"automate_action","confidence":0.95,"params":{"objective":"type hello world"}}
- "move mouse to top left" → {"intent":"automate_action","confidence":0.95,"params":{"objective":"move mouse to top left"}}
- "click the start button" → {"intent":"automate_action","confidence":0.95,"params":{"objective":"click the start button"}}

Special note: If the input contains "(document: [id])", extract the document ID and include it in params.

IMPORTANT: For 'automate_action', the backend expects the objective to be actionable and will generate JSON instructions for the Python automation system (see files under the 'os' directory). Do not return code, only JSON and clear objectives.

Respond ONLY with valid JSON.`;

    try {
      const { response } = await llmService.generateResponse(
        userInput,
        [
          { role: 'system', content: systemPrompt },
          ...conversationHistory.slice(-2)
        ]
      );

      console.debug('[IntentDetection][RawLLMResponse]', response);

      let cleanResponse = response.replace(/```json\n?|\n?```/g, '').trim();
      
      if (!cleanResponse.startsWith('{')) {
        const jsonMatch = cleanResponse.match(/\{.*\}/s);
        if (jsonMatch) {
          cleanResponse = jsonMatch[0];
        } else {
          return {
            intent: 'conversation',
            confidence: 0.8,
            params: {}
          };
        }
      }
      
      const intent = JSON.parse(cleanResponse);
      
      return {
        intent: intent.intent || 'conversation',
        confidence: intent.confidence || 0.5,
        params: intent.params || {},
        response: intent.response
      };
    } catch (error) {
      console.error('Intent detection error:', error);
      return {
        intent: 'conversation',
        confidence: 0.3,
        params: {}
      };
    }
  }

  private async handleAutomateAction(params?: Record<string, any>): Promise<ActionResult> {
    try {
      if (!automateService.isServiceConnected()) {
        const isConnected = await automateService.checkConnection();
        if (!isConnected) {
          return {
            success: false,
            message: "Automation service is not running. Please start the MJAK automation service first.",
            requiresTTS: true
          };
        }
      }

      const objective = params?.objective;
      if (!objective) {
        return {
          success: false,
          message: "Please specify what you'd like me to automate.",
          requiresTTS: true
        };
      }

      const actions = await automateService.generateActions(objective);
      
      if (actions.length === 0) {
        return {
          success: false,
          message: "I couldn't generate automation steps for that request.",
          requiresTTS: true
        };
      }

      const result = await automateService.executeActions({
        actions,
        objective
      });

      if (result.success) {
        return {
          success: true,
          message: `Successfully automated: ${objective}. Executed ${result.executedActions || actions.length} actions.`,
          requiresTTS: true,
          data: { actions, result }
        };
      } else {
        return {
          success: false,
          message: result.message || "Failed to execute automation.",
          requiresTTS: true
        };
      }
    } catch (error) {
      console.error('Automate action error:', error);
      return {
        success: false,
        message: "Failed to process automation request. Please check if the automation service is running.",
        requiresTTS: true
      };
    }
  }

  private async handleSpotifyConnect(): Promise<ActionResult> {
    try {
      if (await spotifyService.isConnected()) {
        return {
          success: true,
          message: "Your Spotify is already connected! You can ask me to play songs.",
          requiresTTS: true
        };
      }

      await spotifyService.initiateAuth();
      return {
        success: true,
        message: "Redirecting you to Spotify to connect your account...",
        requiresTTS: true
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to connect to Spotify. Please try again.",
        requiresTTS: true
      };
    }
  }

  private async handlePlaySong(params?: Record<string, any>): Promise<ActionResult> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return {
          success: false,
          message: "Please sign in to use Spotify features.",
          requiresTTS: true
        };
      }

      const canUse = await subscriptionService.canUseFeature(user.id, 'spotify');
      if (!canUse) {
        const [subscription, usage] = await Promise.all([
          subscriptionService.getUserSubscription(user.id),
          subscriptionService.getCurrentUsage(user.id)
        ]);
        
        const plan = subscriptionService.getPlan(subscription?.tier || 'free');
        const limit = plan?.features.spotifyPlays || 0;
        
        return {
          success: false,
          message: `You've reached your monthly Spotify limit of ${limit} plays. Upgrade your plan to continue or wait for next month.`,
          requiresTTS: true
        };
      }

      if (!await spotifyService.isConnected()) {
        return {
          success: false,
          message: "Please connect your Spotify account first by saying 'connect Spotify'.",
          requiresTTS: true
        };
      }

      const { artist, song } = params || {};
      if (!artist && !song) {
        return {
          success: false,
          message: "Please specify which song or artist you'd like to play.",
          requiresTTS: true
        };
      }

      const query = song ? `${song} ${artist}` : artist;
      const track = await spotifyService.searchTrack(query);
      
      if (!track) {
        return {
          success: false,
          message: `Sorry, I couldn't find "${query}" on Spotify.`,
          requiresTTS: true
        };
      }

      // Try Web Playback SDK first for Premium users
      const profile = await spotifyService.getUserProfile();
      if (profile.product === 'premium') {
        try {
          await spotifyWebPlaybackService.initializePlayer();
          const webPlayResult = await spotifyWebPlaybackService.playTrack(track.uri);
          
          if (webPlayResult.success) {
            await subscriptionService.incrementUsage(user.id, 'spotify');
            return {
              success: true,
              message: `Now playing "${track.name}" by ${track.artist} on your browser!`,
              requiresTTS: true,
              data: { track }
            };
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
              success: false,
              message: "Spotify Premium is required to control playback. Please upgrade your Spotify account to Premium.",
              requiresTTS: true,
              data: { showPremiumPopup: true }
            };
          case 'no_devices':
            return {
              success: false,
              message: "No Spotify devices found. Please open Spotify on a device first (phone, computer, or web player).",
              requiresTTS: true
            };
          case 'no_active_device':
            return {
              success: false,
              message: "No active Spotify device found. Please start playing something on Spotify first, then try again.",
              requiresTTS: true
            };
          case 'forbidden':
            return {
              success: false,
              message: "I don't have permission to control your Spotify playback. Please check your Spotify settings.",
              requiresTTS: true
            };
          default:
            return {
              success: false,
              message: `Failed to play the song: ${playResult.error}. Please check your Spotify connection.`,
              requiresTTS: true
            };
        }
      }
      
      await subscriptionService.incrementUsage(user.id, 'spotify');
      
      return {
        success: true,
        message: `Now playing "${track.name}" by ${track.artist} on Spotify!`,
        requiresTTS: true,
        data: { track }
      };
    } catch (error) {
      console.error('Play song error:', error);
      return {
        success: false,
        message: "Failed to play the song. Please check your Spotify connection.",
        requiresTTS: true
      };
    }
  }

  private async handleSpotifyStatus(): Promise<ActionResult> {
    try {
      const isConnected = await spotifyService.isConnected();
      
      if (!isConnected) {
        return {
          success: true,
          message: "Spotify is not connected. Say 'connect Spotify' to link your account.",
          requiresTTS: true
        };
      }

      const spotifyData = await spotifyService.getStoredSpotifyData();
      const profile = spotifyData.profile;
      
      if (!profile) {
        return {
          success: true,
          message: "Spotify is connected but profile data is not available. Please try reconnecting.",
          requiresTTS: true
        };
      }

      const devices = await spotifyService.getDevices();
      
      return {
        success: true,
        message: `Spotify connected as ${profile.display_name}. You have ${spotifyData.playlists.length} playlists, ${spotifyData.artists.length} top artists, and ${devices.length} device(s) available.`,
        requiresTTS: true,
        data: { profile, devices, ...spotifyData }
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to check Spotify status.",
        requiresTTS: true
      };
    }
  }

  private async handleStartupGreeting(): Promise<ActionResult> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return {
          success: false,
          message: "Please sign in to get a personalized greeting.",
          requiresTTS: true
        };
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('name, last_greeted_at')
        .eq('id', user.id)
        .single();

      const userName = profile?.name || user.email?.split('@')[0] || 'there';

      const shouldGreet = await locationService.shouldGreetUser(user.id);
      
      if (!shouldGreet) {
        return {
          success: true,
          message: `Hello again, ${userName}! How can I help you today?`,
          requiresTTS: true
        };
      }

      const locationData = await locationService.getUserLocation();
      const greeting = locationService.getGreeting(locationData.timezone, userName);
      
      await locationService.updateLastGreeted(user.id);
      
      const locationGreeting = `${greeting}! How are things in ${locationData.city}, ${locationData.country}?`;
      
      return {
        success: true,
        message: locationGreeting,
        requiresTTS: true,
        data: { locationData }
      };
    } catch (error) {
      console.error('Startup greeting error:', error);
      return {
        success: true,
        message: "Hello! How can I help you today?",
        requiresTTS: true
      };
    }
  }

  private async handleLocationQuery(params?: Record<string, any>): Promise<ActionResult> {
    try {
      const locationData = await locationService.getUserLocation();
      const queryType = params?.query_type;
      
      let response = '';
      
      switch (queryType) {
        case 'time':
          const now = new Date().toLocaleString("en-US", { 
            timeZone: locationData.timezone,
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          });
          response = `It's currently ${now} in ${locationData.city}, ${locationData.country}.`;
          break;
          
        case 'location':
          response = `You're in ${locationData.city}, ${locationData.region}, ${locationData.country}. Your timezone is ${locationData.timezone}.`;
          break;
          
        default:
          response = `You're currently in ${locationData.city}, ${locationData.country}. The local time is ${new Date().toLocaleString("en-US", { timeZone: locationData.timezone, hour: '2-digit', minute: '2-digit', hour12: true })}.`;
      }
      
      return {
        success: true,
        message: response,
        requiresTTS: true,
        data: { locationData }
      };
    } catch (error) {
      return {
        success: false,
        message: "I couldn't get your location information right now.",
        requiresTTS: true
      };
    }
  }

  private async handleDocumentCapabilities(): Promise<ActionResult> {
    return {
      success: true,
      message: "Yes, I can summarize, extract text, format any text or PDF file. You can upload it and I'll process it for you.",
      requiresTTS: true
    };
  }

  private async handleDocumentProcessing(params?: Record<string, any>): Promise<ActionResult> {
    const action = params?.action;
    const documentId = params?.documentId;
    const question = params?.question;
    
    if (!action) {
      return {
        success: true,
        message: "Please upload a document first, then tell me what you'd like me to do with it - summarize, extract text, format, or ask questions about it.",
        requiresTTS: true
      };
    }

    if (action && !documentId) {
      return {
        success: true,
        message: "I can help you with document processing. Please upload a PDF or text file first.",
        requiresTTS: true
      };
    }

    try {
      const result = await documentService.processDocument(documentId, action, question);
      
      return {
        success: true,
        message: result,
        requiresTTS: true
      };
    } catch (error) {
      console.error('Document processing error:', error);
      return {
        success: false,
        message: "I encountered an error processing your document. Please try again.",
        requiresTTS: true
      };
    }
  }

  private async storeConversationHistory(
    message: string, 
    intent: string, 
    response: string
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let locationData = null;
      try {
        locationData = await locationService.getUserLocation();
      } catch (error) {
        // Location not critical for history
      }

      await supabase
        .from('user_history')
        .insert({
          user_id: user.id,
          message,
          intent,
          response,
          location_data: locationData
        });
    } catch (error) {
      console.error('Failed to store conversation history:', error);
    }
  }
}

export const actionRouter = new ActionRouter();
