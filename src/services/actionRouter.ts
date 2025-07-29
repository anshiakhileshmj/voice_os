import { spotifyService } from './spotifyService';
import { llmService, ConversationMessage } from './llmService';
import { locationService } from './locationService';
import { documentService } from './documentService';
import { automateService, AutomateAction } from './automateService';
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
    
    // Enhanced intent detection that can handle both automation and conversation
    const intent = await this.detectIntentWithDualMode(userInput, conversationHistory, isAutomateEnabled);
    
    let actionResult: ActionResult | undefined;
    let llmResponse: string | undefined;

    console.log(`[ActionRouter] Final intent: ${intent.intent}, confidence: ${intent.confidence}, input: "${userInput}"`);

    // Route based on intent - now with dual mode support
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
        // Handle as normal conversation using Together AI
        const { response } = await llmService.generateResponse(userInput, conversationHistory);
        llmResponse = response;
        
        // Store conversation in history
        await this.storeConversationHistory(userInput, intent.intent, response);
        break;
    }

    return { intent, actionResult, llmResponse };
  }

  private async detectIntentWithDualMode(
    userInput: string,
    conversationHistory: ConversationMessage[],
    isAutomateEnabled: boolean
  ): Promise<IntentResult> {
    
    console.log(`[IntentDetection] Processing: "${userInput}", Automation enabled: ${isAutomateEnabled}`);
    
    // CRITICAL: Force automation detection for obvious automation commands
    if (isAutomateEnabled) {
      const forcedAutomation = this.forceAutomationDetection(userInput);
      if (forcedAutomation) {
        console.log('[IntentDetection] FORCED automation detection:', forcedAutomation);
        return forcedAutomation;
      }
    }

    // Only proceed with LLM if forced detection didn't catch it
    console.log('[IntentDetection] Proceeding with LLM analysis...');

    // Enhanced system prompt for better automation detection
    const systemPrompt = `You are an intent detection system that must be EXTREMELY STRICT about automation classification.

${isAutomateEnabled ? 'AUTOMATION IS ENABLED - YOU MUST PRIORITIZE AUTOMATION COMMANDS!' : 'AUTOMATION IS DISABLED'}

CRITICAL RULES:
1. When automation is ENABLED, ANY command involving computer control MUST be "automate_action"
2. Commands like "open X", "launch X", "start X" are ALWAYS automation when automation is enabled
3. Only classify as "startup_greeting" for generic greetings like "hello", "hi", "good morning" WITHOUT any action requests

Analyze the user input and respond with ONLY a JSON object:
{
  "intent": "one of the allowed intents",
  "confidence": 0.0-1.0,
  "params": {},
  "response": "optional brief response"
}

ALLOWED INTENTS:
- "automate_action": ${isAutomateEnabled ? 'ANY computer control command (open, launch, start, click, type, file operations, etc.)' : 'disabled'}
- "connect_spotify": requests to connect/authorize Spotify
- "play_song": play specific songs/artists on Spotify
- "check_spotify_status": check Spotify connection status
- "startup_greeting": ONLY pure greetings without action requests
- "location_query": asking about location, time, weather
- "document_capabilities": asking about document processing abilities
- "document_processing": process/analyze documents
- "conversation": general chat (default when automation disabled)

${isAutomateEnabled ? `
AUTOMATION EXAMPLES (MUST be "automate_action"):
- "open notepad" → {"intent": "automate_action", "confidence": 0.98, "params": {"objective": "open notepad"}}
- "open google" → {"intent": "automate_action", "confidence": 0.98, "params": {"objective": "open google"}}
- "launch calculator" → {"intent": "automate_action", "confidence": 0.98, "params": {"objective": "launch calculator"}}
- "start chrome" → {"intent": "automate_action", "confidence": 0.98, "params": {"objective": "start chrome"}}

NON-AUTOMATION EXAMPLES:
- "hello" → {"intent": "startup_greeting", "confidence": 0.9}
- "good morning" → {"intent": "startup_greeting", "confidence": 0.9}
- "how are you" → {"intent": "conversation", "confidence": 0.8}
` : ''}

User input: "${userInput}"

Respond with ONLY valid JSON, no markdown formatting.`;

    try {
      const { response } = await llmService.generateResponse(
        userInput,
        [{ role: 'system', content: systemPrompt }]
      );

      console.log('[IntentDetection][LLMResponse]', response);

      // Clean and parse JSON
      let cleanResponse = response.replace(/```json\n?|\n?```/g, '').trim();
      
      if (!cleanResponse.startsWith('{')) {
        const jsonMatch = cleanResponse.match(/\{[^}]*\}/s);
        if (jsonMatch) {
          cleanResponse = jsonMatch[0];
        }
      }
      
      const intent = JSON.parse(cleanResponse);
      
      console.log('[IntentDetection][ParsedIntent]', intent);
      
      // FINAL OVERRIDE: If automation enabled and looks like automation, force it
      if (isAutomateEnabled && intent.intent !== 'automate_action') {
        const automationOverride = this.forceAutomationDetection(userInput);
        if (automationOverride) {
          console.log(`[IntentDetection] OVERRIDING "${intent.intent}" to "automate_action" for: "${userInput}"`);
          return automationOverride;
        }
      }
      
      return {
        intent: intent.intent || 'conversation',
        confidence: intent.confidence || 0.5,
        params: intent.params || {},
        response: intent.response
      };
    } catch (error) {
      console.error('[IntentDetection] Error:', error);
      
      // Emergency fallback for automation
      if (isAutomateEnabled) {
        const automationFallback = this.forceAutomationDetection(userInput);
        if (automationFallback) {
          console.log('[IntentDetection] ERROR FALLBACK to automation for: "${userInput}"');
          return automationFallback;
        }
      }
      
      return {
        intent: 'conversation',
        confidence: 0.3,
        params: {}
      };
    }
  }

  private forceAutomationDetection(input: string): IntentResult | null {
    const lowerInput = input.toLowerCase().trim();
    console.log(`[ForceAutomation] Analyzing: "${lowerInput}"`);
    
    // Ultra-strict automation patterns - these MUST be automation
    const definiteAutomationPatterns = [
      /^open\s+\w+/i,           // "open notepad", "open google"
      /^launch\s+\w+/i,         // "launch calculator"
      /^start\s+\w+/i,          // "start chrome"
      /^run\s+\w+/i,            // "run application"
      /^execute\s+\w+/i,        // "execute program"
      /^(click|type|press)\s+/i // "click button", "type text"
    ];
    
    // Check strict patterns first
    for (const pattern of definiteAutomationPatterns) {
      if (pattern.test(lowerInput)) {
        console.log(`[ForceAutomation] MATCH found with pattern: ${pattern}`);
        return {
          intent: 'automate_action',
          confidence: 0.99,
          params: { objective: input.trim() }
        };
      }
    }

    // Check for application/system keywords with action verbs
    const automationApps = [
      'notepad', 'calculator', 'chrome', 'firefox', 'edge', 'safari',
      'word', 'excel', 'powerpoint', 'outlook', 'teams',
      'google', 'youtube', 'facebook', 'twitter',
      'vscode', 'visual studio', 'atom', 'sublime',
      'file explorer', 'explorer', 'cmd', 'terminal', 'powershell',
      'paint', 'photoshop', 'gimp', 'spotify', 'steam',
      'discord', 'slack', 'zoom', 'skype'
    ];

    const actionVerbs = ['open', 'launch', 'start', 'run', 'execute', 'load', 'boot'];
    
    // Check if input contains action verb + app
    const hasActionVerb = actionVerbs.some(verb => lowerInput.includes(verb));
    const hasApp = automationApps.some(app => lowerInput.includes(app));
    
    if (hasActionVerb && hasApp) {
      console.log(`[ForceAutomation] Action verb + App detected: verb=${hasActionVerb}, app=${hasApp}`);
      return {
        intent: 'automate_action',
        confidence: 0.95,
        params: { objective: input.trim() }
      };
    }

    console.log(`[ForceAutomation] No automation pattern found for: "${lowerInput}"`);
    return null;
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

      console.log(`[AutomateAction] Processing objective: "${objective}"`);

      // Generate actions using the Python backend
      const actions = await automateService.generateActions(objective);
      
      if (actions.length === 0) {
        return {
          success: false,
          message: "I couldn't generate automation steps for that request.",
          requiresTTS: true
        };
      }

      console.log(`[AutomateAction] Generated ${actions.length} actions`);

      // Execute the actions
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

      // Check if user has premium
      const profile = await spotifyService.getUserProfile();
      if (profile.product !== 'premium') {
        return {
          success: false,
          message: "Spotify Premium is required to control playback. Please upgrade your account.",
          requiresTTS: true
        };
      }

      // Get active devices
      const devices = await spotifyService.getDevices();
      const activeDevice = devices.find(d => d.is_active);
      
      if (!activeDevice && devices.length === 0) {
        return {
          success: false,
          message: "No Spotify devices found. Please open Spotify on a device first.",
          requiresTTS: true
        };
      }

      // Search for track
      const query = song ? `${song} ${artist}` : artist;
      const track = await spotifyService.searchTrack(query);
      
      if (!track) {
        return {
          success: false,
          message: `Sorry, I couldn't find "${query}" on Spotify.`,
          requiresTTS: true
        };
      }

      // Play track
      await spotifyService.playTrack(track.uri, activeDevice?.id);
      
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

      const profile = await spotifyService.getUserProfile();
      const devices = await spotifyService.getDevices();
      
      return {
        success: true,
        message: `Spotify connected as ${profile.display_name}. ${devices.length} device(s) available.`,
        requiresTTS: true,
        data: { profile, devices }
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

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, last_greeted_at')
        .eq('id', user.id)
        .single();

      const userName = profile?.name || user.email?.split('@')[0] || 'there';

      // Check if we should greet today
      const shouldGreet = await locationService.shouldGreetUser(user.id);
      
      if (!shouldGreet) {
        return {
          success: true,
          message: `Hello again, ${userName}! How can I help you today?`,
          requiresTTS: true
        };
      }

      // Get user location for personalized greeting
      const locationData = await locationService.getUserLocation();
      const greeting = locationService.getGreeting(locationData.timezone, userName);
      
      // Update last greeted
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
          // General location info
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

    // Process the document using the existing documentService
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

      // Get location data if available
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
