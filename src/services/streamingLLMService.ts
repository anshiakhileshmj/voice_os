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

export class StreamingLLMService {
  private conversationHistory: StreamingMessage[] = [];
  private abortController: AbortController | null = null;
  private partialChunk: string = ''; // Buffer for incomplete JSON chunks

  async generateStreamingResponse(
    userMessage: string,
    callbacks: StreamingResponse
  ): Promise<void> {
    if (!userMessage.trim()) {
      callbacks.onError(new Error('Message cannot be empty.'));
      return;
    }

    // Add user message to history
    const userMsg: StreamingMessage = { role: 'user', content: userMessage.trim() };
    this.conversationHistory.push(userMsg);

    try {
      console.log('Starting streaming LLM response for:', userMessage.substring(0, 50) + '...');
      
      // Cancel any existing request
      if (this.abortController) {
        this.abortController.abort();
      }
      this.abortController = new AbortController();

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
          conversationHistory: this.conversationHistory.slice(-8), // Keep last 8 messages
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
      this.partialChunk = ''; // Reset partial chunk buffer

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        // Add chunk to any existing partial data
        const completeChunk = this.partialChunk + chunk;
        const lines = completeChunk.split('\n');
        
        // Keep the last line as partial if it doesn't end with newline
        this.partialChunk = completeChunk.endsWith('\n') ? '' : lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;
            if (!data) continue; // Skip empty data lines
            
            try {
              const parsed = JSON.parse(data);
              // Handle both OpenAI and Together AI response formats
              const content = parsed.choices?.[0]?.delta?.content || 
                             parsed.choices?.[0]?.text || '';
              
              if (content) {
                fullResponse += content;
                callbacks.onChunk(content);
              }
            } catch (e) {
              // Only log if it's not just a partial chunk
              if (data.length > 10) {
                console.warn('Skipped malformed chunk (will retry):', data.substring(0, 100) + '...');
              }
            }
          }
        }
      }

      // Process any remaining partial chunk
      if (this.partialChunk.startsWith('data: ')) {
        const data = this.partialChunk.slice(6).trim();
        if (data && data !== '[DONE]') {
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content || 
                           parsed.choices?.[0]?.text || '';
            if (content) {
              fullResponse += content;
              callbacks.onChunk(content);
            }
          } catch (e) {
            console.warn('Final chunk parse failed:', data);
          }
        }
      }

      // Add assistant response to history
      const assistantMsg: StreamingMessage = { role: 'assistant', content: fullResponse };
      this.conversationHistory.push(assistantMsg);

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

  stopStreaming() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.partialChunk = ''; // Clear partial chunk buffer
  }

  clearHistory() {
    this.conversationHistory = [];
  }

  getHistory(): StreamingMessage[] {
    return [...this.conversationHistory];
  }
}

export const streamingLLMService = new StreamingLLMService();
