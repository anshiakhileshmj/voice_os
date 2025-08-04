
import { supabase } from '@/integrations/supabase/client';

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export class LLMService {
  private isProcessing = false; // Prevent duplicate requests
  
  async generateResponse(
    userMessage: string, 
    conversationHistory: ConversationMessage[] = []
  ): Promise<{ response: string; updatedHistory: ConversationMessage[]; modelUsed?: string }> {
    if (!userMessage.trim()) {
      throw new Error('Message cannot be empty.');
    }

    // Prevent duplicate requests
    if (this.isProcessing) {
      console.log('Request already in progress, skipping duplicate');
      throw new Error('Request already in progress');
    }

    try {
      this.isProcessing = true;
      console.log('Generating LLM response for:', userMessage.substring(0, 50) + '...');
      
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
          message: userMessage.trim(),
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
        updatedHistory: result.updatedHistory,
        modelUsed: result.modelUsed
      };
    } catch (error) {
      console.error('LLM service error:', error);
      if (error instanceof Error) {
        throw new Error(`Failed to generate LLM response: ${error.message}`);
      }
      throw new Error('Failed to generate LLM response: Unknown error');
    } finally {
      this.isProcessing = false; // Always reset the flag
    }
  }

  // Simple intent detection without JSON parsing issues
  detectIntent(message: string): { intent: string; confidence: number; params: any } {
    const lowerMessage = message.toLowerCase().trim();
    
    // Simple keyword-based intent detection to avoid JSON parsing issues
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
      return { intent: 'greeting', confidence: 0.8, params: {} };
    }
    
    if (lowerMessage.includes('open') || lowerMessage.includes('launch') || lowerMessage.includes('start')) {
      return { intent: 'automation', confidence: 0.7, params: { action: 'open' } };
    }
    
    if (lowerMessage.includes('weather') || lowerMessage.includes('temperature')) {
      return { intent: 'weather', confidence: 0.9, params: {} };
    }
    
    // Default to conversation
    return { intent: 'conversation', confidence: 0.5, params: {} };
  }
}

export const llmService = new LLMService();
