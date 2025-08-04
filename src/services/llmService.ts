
import { supabase } from '@/integrations/supabase/client';
import { commandSequencer } from './commandSequencer';

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export class LLMService {
  private processingCommand = false;

  async generateResponse(
    userMessage: string, 
    conversationHistory: ConversationMessage[] = []
  ): Promise<{ response: string; updatedHistory: ConversationMessage[] }> {
    if (!userMessage.trim()) {
      throw new Error('Message cannot be empty.');
    }

    try {
      console.log('Generating LLM response for:', userMessage.substring(0, 50) + '...');
      
      // Add command to sequencer if not already processing
      if (!this.processingCommand) {
        this.processingCommand = true;
        
        // Wait for potential additional commands
        const commands = await commandSequencer.addCommand(userMessage);
        
        // If we have multiple commands, combine them
        const finalMessage = commands.length > 1 
          ? `I have multiple commands in sequence: ${commands.join(', ')}. Please respond to the most recent or relevant one: "${commands[commands.length - 1]}"`
          : userMessage;

        const result = await this.processLLMRequest(finalMessage, conversationHistory);
        this.processingCommand = false;
        return result;
      } else {
        // If already processing, just add to queue and return a simple acknowledgment
        await commandSequencer.addCommand(userMessage);
        return {
          response: "I'm processing your commands...",
          updatedHistory: conversationHistory
        };
      }
    } catch (error) {
      this.processingCommand = false;
      console.error('LLM service error:', error);
      if (error instanceof Error) {
        throw new Error(`Failed to generate LLM response: ${error.message}`);
      }
      throw new Error('Failed to generate LLM response: Unknown error');
    }
  }

  private async processLLMRequest(
    message: string,
    conversationHistory: ConversationMessage[]
  ): Promise<{ response: string; updatedHistory: ConversationMessage[] }> {
    // Get the current session to include auth header
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('User not authenticated');
    }

    // Use direct fetch with proper headers
    const response = await fetch('https://uasluhbtcpuigwkuslum.supabase.co/functions/v1/llm-chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhc2x1aGJ0Y3B1aWd3a3VzbHVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzNDkwOTUsImV4cCI6MjA2NjkyNTA5NX0.hmdgaWm1-Xso9ZIQHiVSWcuPEfu4qmat-YR1qoYAFAs',
      },
      body: JSON.stringify({
        message: message.trim(),
        conversationHistory,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
      throw new Error(error.error || 'Failed to generate LLM response');
    }

    const result = await response.json();
    
    console.log('Successfully received LLM response:', result.response.substring(0, 100) + '...');
    return {
      response: result.response,
      updatedHistory: result.updatedHistory
    };
  }
}

export const llmService = new LLMService();
