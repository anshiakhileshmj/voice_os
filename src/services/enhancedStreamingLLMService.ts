
import { supabase } from '@/integrations/supabase/client';
import { conversationContextService } from './conversationContextService';

export interface StreamingMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
}

export interface EnhancedStreamingResponse {
  onChunk: (chunk: string) => void;
  onComplete: (fullResponse: string, turnId: string) => void;
  onError: (error: Error) => void;
  onContextUpdate?: (context: string) => void;
}

class EnhancedStreamingLLMService {
  private abortController: AbortController | null = null;
  private streamBuffer: string = '';
  private readonly CONTEXT_CHUNK_SIZE = 50; // Send context every 50 characters

  async generateContextAwareResponse(
    userMessage: string,
    callbacks: EnhancedStreamingResponse,
    turnId?: string
  ): Promise<void> {
    if (!userMessage.trim()) {
      callbacks.onError(new Error('Message cannot be empty.'));
      return;
    }

    try {
      console.log('Starting context-aware streaming response for:', userMessage.substring(0, 50) + '...');
      
      // Cancel any existing request
      if (this.abortController) {
        this.abortController.abort();
      }
      this.abortController = new AbortController();

      // Get conversation context
      const conversationContext = conversationContextService.getContextForLLM();
      const currentTopic = conversationContextService.getCurrentTopic();
      
      // Build enhanced system prompt with context
      const systemPrompt = this.buildContextAwareSystemPrompt(conversationContext, currentTopic);
      
      // Prepare messages with context
      const messages: StreamingMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage.trim() }
      ];

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('User not authenticated');
      }

      const response = await fetch('https://uasluhbtcpuigwkuslum.supabase.co/functions/v1/streaming-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhc2x1aGJ0Y3B1aWd3a3VzbHVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzNDkwOTUsImV4cCI6MjA2NjkyNTA5NX0.hmdgaWm1-Xso9ZIQHiVSWcuPEfu4qmat-YR1qoYAFAs',
        },
        body: JSON.stringify({
          message: userMessage.trim(),
          conversationHistory: messages,
          useContextAware: true
        }),
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
        throw new Error(error.error || 'Failed to generate context-aware response');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response stream available');
      }

      const decoder = new TextDecoder();
      let fullResponse = '';
      this.streamBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              if (parsed.choices?.[0]?.delta?.content) {
                const content = parsed.choices[0].delta.content;
                fullResponse += content;
                this.streamBuffer += content;
                
                // Send chunk to callback
                callbacks.onChunk(content);
                
                // Send context updates periodically
                if (this.streamBuffer.length >= this.CONTEXT_CHUNK_SIZE && callbacks.onContextUpdate) {
                  callbacks.onContextUpdate(this.streamBuffer);
                  this.streamBuffer = '';
                }
              }
            } catch (e) {
              console.warn('Skipped malformed chunk:', data);
            }
          }
        }
      }

      // Update conversation context
      if (turnId) {
        conversationContextService.addAIResponse(turnId, fullResponse);
      }

      // Extract and update topic if needed
      this.updateTopicFromResponse(fullResponse);

      callbacks.onComplete(fullResponse, turnId || '');
      
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Context-aware streaming request aborted');
        return;
      }
      
      console.error('Enhanced streaming LLM service error:', error);
      callbacks.onError(error instanceof Error ? error : new Error('Unknown streaming error'));
    }
  }

  private buildContextAwareSystemPrompt(context: string, currentTopic?: string): string {
    let systemPrompt = `You are MJAK, an advanced voice AI assistant with conversation awareness. 
Keep responses natural and conversational for voice interaction.

🎵 MUSIC: Help with music requests and Spotify integration
🤖 AUTOMATION: Assist with computer control and app launching  
📄 DOCUMENTS: Help with document processing and questions
🌍 LOCATION: Provide time and location information
🗣️ VOICE CHAT: Maintain natural conversation flow with context awareness

Guidelines:
- Remember previous parts of our conversation
- Build upon context from earlier messages
- Be concise but informative for voice interaction
- Ask follow-up questions when context suggests it
- Maintain conversation flow naturally`;

    if (currentTopic) {
      systemPrompt += `\n\nCurrent conversation topic: ${currentTopic}`;
    }

    if (context.trim()) {
      systemPrompt += `\n\n${context}`;
    }

    return systemPrompt;
  }

  private updateTopicFromResponse(response: string): void {
    // Simple topic extraction based on keywords
    const topicKeywords = [
      'music', 'spotify', 'song', 'playlist',
      'weather', 'time', 'location',
      'document', 'file', 'pdf',
      'automation', 'computer', 'app'
    ];

    const lowerResponse = response.toLowerCase();
    for (const keyword of topicKeywords) {
      if (lowerResponse.includes(keyword)) {
        conversationContextService.updateTopic(keyword);
        break;
      }
    }
  }

  stopStreaming(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  getConversationStats() {
    return conversationContextService.getSessionStats();
  }

  resetConversation(): void {
    conversationContextService.resetSession();
  }
}

export const enhancedStreamingLLMService = new EnhancedStreamingLLMService();
