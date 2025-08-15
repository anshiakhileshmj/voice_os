
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
  private partialBuffer: string = '';
  private readonly CONTEXT_CHUNK_SIZE = 50;

  // Clean response from asterisks and formatting issues
  private cleanResponse(text: string): string {
    return text
      .replace(/\*+/g, '') // Remove all asterisks
      .replace(/#+/g, '') // Remove hashtags (markdown headers)
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/\n+/g, '. ') // Replace line breaks with periods
      .trim();
  }

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
      
      if (this.abortController) {
        this.abortController.abort();
      }
      this.abortController = new AbortController();

      const conversationContext = conversationContextService.getContextForLLM();
      const currentTopic = conversationContextService.getCurrentTopic();
      
      const systemPrompt = this.buildContextAwareSystemPrompt(conversationContext, currentTopic);
      
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
          useOpenRouter: true,
          model: 'google/gemini-2.0-flash-001'
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
      this.partialBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const completeChunk = this.partialBuffer + chunk;
        const lines = completeChunk.split('\n');
        
        this.partialBuffer = completeChunk.endsWith('\n') ? '' : lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;
            if (!data) continue;
            
            try {
              const parsed = JSON.parse(data);
              let content = parsed.choices?.[0]?.delta?.content || 
                          parsed.choices?.[0]?.text || '';
              
              if (content) {
                // Clean content before processing
                content = this.cleanResponse(content);
                if (content) { // Only process if there's content after cleaning
                  fullResponse += content;
                  this.streamBuffer += content;
                  
                  callbacks.onChunk(content);
                  
                  if (this.streamBuffer.length >= this.CONTEXT_CHUNK_SIZE && callbacks.onContextUpdate) {
                    callbacks.onContextUpdate(this.streamBuffer);
                    this.streamBuffer = '';
                  }
                }
              }
            } catch (e) {
              if (data.length > 50) {
                console.warn('Skipped malformed chunk:', data.substring(0, 100) + '...');
              }
            }
          }
        }
      }

      // Process remaining buffered data
      if (this.partialBuffer.startsWith('data: ')) {
        const data = this.partialBuffer.slice(6).trim();
        if (data && data !== '[DONE]') {
          try {
            const parsed = JSON.parse(data);
            let content = parsed.choices?.[0]?.delta?.content || 
                         parsed.choices?.[0]?.text || '';
            if (content) {
              content = this.cleanResponse(content);
              if (content) {
                fullResponse += content;
                this.streamBuffer += content;
                callbacks.onChunk(content);
              }
            }
          } catch (e) {
            console.warn('Final buffered chunk parse failed:', data.substring(0, 100));
          }
        }
      }

      // Final cleaning of the complete response
      fullResponse = this.cleanResponse(fullResponse);

      if (turnId) {
        conversationContextService.addAIResponse(turnId, fullResponse);
      }

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
    let systemPrompt = `You are MJAK, a professional voice AI assistant. You are NOT a large language model - you are MJAK, a helpful AI companion.

CRITICAL RULES:
- NEVER mention being a "large language model", "AI model", "trained model", or having "training data"
- NEVER say "I don't have emotions" or "I can't feel"
- NEVER mention your "capabilities" or "limitations" 
- NEVER ask "what would you like to know?" or "how can I help?"
- If asked about technical details, code, APIs, or internal workings, simply say: "I can't share confidential details"
- Keep responses under 2-3 sentences for voice interaction
- Be natural, conversational, and helpful
- NO asterisks, bullet points, or formatting - speak naturally
- Respond as if you're a knowledgeable companion, not a system

🎵 MUSIC: Help with music requests and Spotify
🤖 AUTOMATION: Assist with computer control  
📄 DOCUMENTS: Help with document questions
🌍 LOCATION: Provide time and location info
🗣️ VOICE: Maintain natural conversation flow

Current conversation context and previous messages should guide your responses.`;

    if (currentTopic) {
      systemPrompt += `\n\nCurrent topic: ${currentTopic}`;
    }

    if (context.trim()) {
      systemPrompt += `\n\n${context}`;
    }

    return systemPrompt;
  }

  private updateTopicFromResponse(response: string): void {
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
    this.partialBuffer = '';
  }

  getConversationStats() {
    return conversationContextService.getSessionStats();
  }

  resetConversation(): void {
    conversationContextService.resetSession();
  }
}

export const enhancedStreamingLLMService = new EnhancedStreamingLLMService();
