
import { supabase } from '@/integrations/supabase/client';

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface LLMResponse {
  intent: string;
  confidence: number;
  params: any;
  response: string;
}

// Free and fast models from Together AI - prioritize free models
const FREE_MODELS = [
  'meta-llama/Llama-3.2-3B-Instruct-Turbo',
  'meta-llama/Llama-3.2-1B-Instruct-Turbo',
  'microsoft/DialoGPT-medium',
  'mistralai/Mistral-7B-Instruct-v0.1',
];

export class LLMService {
  private static instance: LLMService;
  private processing = false; // Prevent duplicate calls
  
  private constructor() {}

  static getInstance(): LLMService {
    if (!LLMService.instance) {
      LLMService.instance = new LLMService();
    }
    return LLMService.instance;
  }

  async generateResponse(userInput: string, conversationHistory: ConversationMessage[] = []): Promise<{ response: string; updatedHistory: ConversationMessage[] }> {
    // Prevent duplicate processing
    if (this.processing) {
      console.log('Already processing, ignoring duplicate request');
      return { response: '', updatedHistory: conversationHistory };
    }

    this.processing = true;
    
    try {
      console.log('Generating LLM response for:', userInput.substring(0, 50) + '...');

      const { data, error } = await supabase.functions.invoke('llm-chat', {
        body: {
          message: userInput,
          model: FREE_MODELS[0], // Use the fastest free model
          systemPrompt: 'You are a helpful AI assistant. Respond naturally and conversationally. Keep responses concise and friendly.',
          conversationHistory: conversationHistory.slice(-4) // Keep last 4 messages for context
        }
      });

      if (error) {
        console.error('LLM service error:', error);
        throw new Error(`LLM service failed: ${error.message}`);
      }

      if (!data || !data.response) {
        throw new Error('No response received from LLM service');
      }

      console.log('Successfully received LLM response:', data.response.substring(0, 100) + '...');
      
      // Create updated conversation history
      const updatedHistory = [
        ...conversationHistory,
        { role: 'user' as const, content: userInput },
        { role: 'assistant' as const, content: data.response }
      ];

      return { 
        response: data.response,
        updatedHistory: updatedHistory
      };

    } catch (error) {
      console.error('Error generating LLM response:', error);
      const errorResponse = 'I apologize, but I encountered an error while processing your request. Please try again.';
      
      const updatedHistory = [
        ...conversationHistory,
        { role: 'user' as const, content: userInput },
        { role: 'assistant' as const, content: errorResponse }
      ];

      return { 
        response: errorResponse,
        updatedHistory: updatedHistory
      };
    } finally {
      // Reset processing flag after a short delay to prevent rapid successive calls
      setTimeout(() => {
        this.processing = false;
      }, 1000);
    }
  }

  async processUserInput(userInput: string): Promise<LLMResponse> {
    // Simple intent detection using keywords instead of JSON parsing
    const intent = this.detectSimpleIntent(userInput);
    const { response } = await this.generateResponse(userInput);
    
    return {
      intent: intent.intent,
      confidence: intent.confidence,
      params: intent.params,
      response: response
    };
  }

  private detectSimpleIntent(input: string): { intent: string; confidence: number; params: any } {
    const lowerInput = input.toLowerCase();
    
    // Simple keyword-based intent detection
    if (lowerInput.includes('hello') || lowerInput.includes('hi') || lowerInput.includes('hey')) {
      return { intent: 'greeting', confidence: 0.9, params: {} };
    }
    
    if (lowerInput.includes('weather')) {
      return { intent: 'weather', confidence: 0.8, params: {} };
    }
    
    if (lowerInput.includes('time') || lowerInput.includes('clock')) {
      return { intent: 'time', confidence: 0.8, params: {} };
    }
    
    if (lowerInput.includes('music') || lowerInput.includes('play') || lowerInput.includes('song')) {
      return { intent: 'music', confidence: 0.7, params: {} };
    }
    
    // Default to conversation
    return { intent: 'conversation', confidence: 0.6, params: {} };
  }

  isConfigured(): boolean {
    return true; // Always return true since we're using Supabase edge functions
  }
}

export const llmService = LLMService.getInstance();
