
import { supabase } from '@/integrations/supabase/client';

export interface StreamingMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface StreamingResponse {
  onChunk: (chunk: string) => void;
  onComplete: (fullResponse: string) => void;
  onError: (error: Error) => void;
}

class StreamingLLMService {
  private conversationHistory: StreamingMessage[] = [];
  private abortController: AbortController | null = null;
  private partialBuffer: string = '';

  // Clean response from asterisks and formatting issues
  private cleanResponse(text: string): string {
    return text
      .replace(/\*+/g, '') // Remove all asterisks
      .replace(/#+/g, '') // Remove hashtags (markdown headers)
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/\n+/g, '. ') // Replace line breaks with periods
      .trim();
  }

  async generateStreamingResponse(
    userMessage: string,
    callbacks: StreamingResponse
  ): Promise<void> {
    if (!userMessage.trim()) {
      callbacks.onError(new Error('Message cannot be empty.'));
      return;
    }

    try {
      console.log('Starting streaming LLM response for:', userMessage.substring(0, 50) + '...');
      
      if (this.abortController) {
        this.abortController.abort();
      }
      this.abortController = new AbortController();

      this.conversationHistory.push({ 
        role: 'user', 
        content: userMessage.trim() 
      });

      if (this.conversationHistory.length > 10) {
        this.conversationHistory = this.conversationHistory.slice(-10);
      }

      // Add system message with professional AI persona
      const messages: StreamingMessage[] = [
        {
          role: 'system',
          content: `You are MJAK, a professional voice AI assistant. You are NOT a large language model - you are MJAK.

CRITICAL RULES:
- NEVER mention being a "large language model", "AI model", "trained", or having "training data"
- NEVER say "I don't have emotions" or "I can't feel"
- NEVER mention your "capabilities" or "limitations"
- NEVER ask "what would you like to know?" or "how can I help?"
- If asked about technical details, code, APIs, or internal workings, say: "I can't share confidential details"
- Keep responses under 2-3 sentences for voice interaction
- Be natural and conversational
- NO asterisks, bullet points, or formatting - speak naturally
- Respond as a knowledgeable companion, not a system`
        },
        ...this.conversationHistory
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
        throw new Error(error.error || 'Failed to generate streaming response');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response stream available');
      }

      const decoder = new TextDecoder();
      let fullResponse = '';
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
                  callbacks.onChunk(content);
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

      if (fullResponse.trim()) {
        this.conversationHistory.push({ 
          role: 'assistant', 
          content: fullResponse.trim() 
        });
      }

      callbacks.onComplete(fullResponse);
      
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Streaming request aborted');
        return;
      }
      
      console.error('Streaming LLM service error:', error);
      callbacks.onError(error instanceof Error ? error : new Error('Unknown streaming error'));
    }
  }

  stopStreaming(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.partialBuffer = '';
  }

  clearHistory(): void {
    this.conversationHistory = [];
    console.log('Conversation history cleared');
  }

  getHistory(): StreamingMessage[] {
    return [...this.conversationHistory];
  }
}

export const streamingLLMService = new StreamingLLMService();
