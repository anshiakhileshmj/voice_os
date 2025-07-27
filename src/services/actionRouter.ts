import { spotifyService } from './spotifyService';
import { llmService, ConversationMessage } from './llmService';
import { locationService } from './locationService';
import { documentService } from './documentService';
import { fileSystemService } from './fileSystemService';
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
    isAutomateEnabled: boolean = true,
    isCallActive: boolean = true
  ): Promise<{ intent: IntentResult; actionResult?: ActionResult; llmResponse?: string }> {
    
    // Enhanced intent detection that can handle both automation and conversation
    const intent = await this.detectIntentWithDualMode(userInput, conversationHistory, isAutomateEnabled);
    
    let actionResult: ActionResult | undefined;
    let llmResponse: string | undefined;

    // Route based on intent - now with dual mode support
    switch (intent.intent) {
      case 'automate_action':
        actionResult = await this.handleAutomateAction(intent.params, isCallActive);
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

      case 'file_system_document':
        actionResult = await this.handleFileSystemDocument(intent.params);
        break;
        
      case 'conversation':
      default:
        // Handle as normal conversation using Together AI
        if (isCallActive) {
          const { response } = await llmService.generateResponse(userInput, conversationHistory);
          llmResponse = response;
          
          // Store conversation in history
          await this.storeConversationHistory(userInput, intent.intent, response);
        } else {
          // Don't respond if call is not active
          llmResponse = undefined;
        }
        break;
    }

    return { intent, actionResult, llmResponse };
  }

  private async detectIntentWithDualMode(
    userInput: string,
    conversationHistory: ConversationMessage[],
    isAutomateEnabled: boolean
  ): Promise<IntentResult> {
    // Enhanced system prompt for dual mode detection
    const automateIntentText = isAutomateEnabled 
      ? `
- "automate_action": detect clear automation requests like "open google", "open notepad", "launch calculator", "start word", "take a screenshot", "close window", "type text", "move mouse", "click button", "open file", "save document", etc. These should be SPECIFIC computer actions.
- "file_system_document": detect requests to access local PDF files like "find file abc.pdf", "summarize document xyz.pdf", "tell me about file named report.pdf", "access my file called invoice.pdf", etc.
- "conversation": detect general conversation, questions, casual talk, requests for information, discussions that are NOT specific computer automation commands.

IMPORTANT: When automation is enabled, you must distinguish between:
1. AUTOMATION commands: Clear, specific computer actions (open apps, click things, type text, etc.)
2. FILE SYSTEM access: Requests to access, read, or process local PDF files
3. CONVERSATION: General chat, questions, information requests, casual talk

Examples of AUTOMATION: "open notepad", "click the start button", "type hello world", "launch chrome", "take screenshot"
Examples of FILE SYSTEM: "find abc.pdf", "summarize my document report.pdf", "tell me about invoice.pdf"
Examples of CONVERSATION: "how are you", "what's the weather", "tell me about AI", "what can you do", "I'm feeling sad"
`
      : ', "conversation": all general conversation and questions since automation is disabled';

    const systemPrompt = `You are an intent detection system with dual mode capability. Analyze the user's input and respond with a JSON object containing:
- intent: one of ["connect_spotify", "play_song", "check_spotify_status", "startup_greeting", "location_query", "document_capabilities", "document_processing", "file_system_document", "automate_action", "conversation"]  
- confidence: number between 0-1
- params: object with extracted parameters
- response: brief response if action needed

Intent definitions:
- "startup_greeting": app startup or first interaction
- "location_query": asking about city, region, country, time, weather, or location info
- "document_capabilities": asking what can be done with documents or file processing
- "document_processing": commands to summarize, extract, format documents, ask questions about files, or document-related requests
- "file_system_document": requests to access, read, or process local PDF files on the user's system
- "play_song": extract artist and song from phrases like "play [song] by [artist]", "play [artist]", etc.
- "connect_spotify": detect requests to connect/link/authorize Spotify
- "check_spotify_status": detect requests about Spotify connection status${automateIntentText}

For automation commands, extract the user's objective as 'objective' in params.
For file system document requests, extract the filename as 'filename' in params.

Special note: If the input contains "(document: [id])", extract the document ID and include it in params.

CRITICAL: Be precise in distinguishing automation vs file system access vs conversation when automation is enabled. Only classify as "automate_action" if it's a clear computer automation command, and "file_system_document" if it's requesting access to local PDF files.

Respond ONLY with valid JSON.`;

    try {
      const { response } = await llmService.generateResponse(
        userInput,
        [
          { role: 'system', content: systemPrompt },
          ...conversationHistory.slice(-2) // Keep minimal context for speed
        ]
      );

      // Debug: Log the raw LLM response for intent detection
      console.debug('[IntentDetection][RawLLMResponse]', response);

      // Try to parse JSON response - handle various formats
      let cleanResponse = response.replace(/```json\n?|\n?```/g, '').trim();
      
      // If response doesn't start with {, try to find JSON in the response
      if (!cleanResponse.startsWith('{')) {
        const jsonMatch = cleanResponse.match(/\{.*\}/s);
        if (jsonMatch) {
          cleanResponse = jsonMatch[0];
        } else {
          // If no JSON found, treat as conversation
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

  private async handleAutomateAction(params?: Record<string, any>, isCallActive: boolean = true): Promise<ActionResult> {
    try {
      if (!automateService.isServiceConnected()) {
        const isConnected = await automateService.checkConnection();
        if (!isConnected) {
          return {
            success: false,
            message: "Automation service is not running. Please start the MJAK automation service first.",
            requiresTTS: isCallActive
          };
        }
      }

      const objective = params?.objective;
      if (!objective) {
        return {
          success: false,
          message: "Please specify what you'd like me to automate.",
          requiresTTS: isCallActive
        };
      }

      // Generate actions using the Python backend
      const actions = await automateService.generateActions(objective);
      
      if (actions.length === 0) {
        return {
          success: false,
          message: "I couldn't generate automation steps for that request.",
          requiresTTS: isCallActive
        };
      }

      // Execute the actions
      const result = await automateService.executeActions({
        actions,
        objective
      });

      if (result.success) {
        return {
          success: true,
          message: `Successfully automated: ${objective}. Executed ${result.executedActions || actions.length} actions.`,
          requiresTTS: isCallActive,
          data: { actions, result }
        };
      } else {
        return {
          success: false,
          message: result.message || "Failed to execute automation.",
          requiresTTS: isCallActive
        };
      }
    } catch (error) {
      console.error('Automate action error:', error);
      return {
        success: false,
        message: "Failed to process automation request. Please check if the automation service is running.",
        requiresTTS: isCallActive
      };
    }
  }

  private async handleFileSystemDocument(params?: Record<string, any>): Promise<ActionResult> {
    try {
      const filename = params?.filename;
      if (!filename) {
        return {
          success: false,
          message: "Please specify which file you'd like me to access.",
          requiresTTS: true
        };
      }

      // Search for the file in the user's system
      const fileResult = await fileSystemService.searchAndProcessFile(filename);
      
      if (!fileResult.found) {
        return {
          success: false,
          message: `I couldn't find the file "${filename}" in your Documents, Downloads, or Desktop folders. ${fileResult.error || ''}`,
          requiresTTS: true
        };
      }

      // Upload the file content to our document service for processing
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return {
          success: false,
          message: "You need to be signed in to process files.",
          requiresTTS: true
        };
      }

      // Create a temporary file object for processing
      const tempFile = {
        name: fileResult.fileName || filename,
        type: 'application/pdf',
        size: fileResult.content?.length || 0
      };

      // Upload the document
      const uploadedDoc = await documentService.uploadDocument({
        ...tempFile,
        arrayBuffer: async () => {
          const base64Data = fileResult.content?.split(',')[1] || '';
          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          return bytes.buffer;
        }
      } as File, user.id);

      // Process the document (summarize by default)
      const result = await documentService.processDocument(uploadedDoc.id, 'summarize');

      return {
        success: true,
        message: `I found and processed "${fileResult.fileName || filename}". Here's the summary: ${result}`,
        requiresTTS: true,
        data: { uploadedDoc, result }
      };
    } catch (error) {
      console.error('File system document error:', error);
      return {
        success: false,
        message: "I encountered an error while trying to access your file. Please make sure the file exists and is accessible.",
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

      const profile = await spotifyService.getUserProfile();
      if (profile.product !== 'premium') {
        return {
          success: false,
          message: "Spotify Premium is required to control playback. Please upgrade your account.",
          requiresTTS: true
        };
      }

      const devices = await spotifyService.getDevices();
      const activeDevice = devices.find(d => d.is_active);
      
      if (!activeDevice && devices.length === 0) {
        return {
          success: false,
          message: "No Spotify devices found. Please open Spotify on a device first.",
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
