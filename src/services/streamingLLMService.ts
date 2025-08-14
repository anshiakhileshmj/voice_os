
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
  private lastRequestTime = 0;
  private minRequestInterval = 2000; // 2 seconds between requests

  async generateStreamingResponse(
    userMessage: string,
    callbacks: StreamingResponse
  ): Promise<void> {
    if (!userMessage.trim()) {
      callbacks.onError(new Error('Message cannot be empty.'));
      return;
    }

    // Rate limiting - ensure minimum interval between requests
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.minRequestInterval) {
      const delay = this.minRequestInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    this.lastRequestTime = Date.now();

    // Add system context for better time and location awareness
    const systemContext = this.getSystemContext();
    const messages = [
      { role: 'system' as const, content: systemContext },
      ...this.conversationHistory.slice(-6), // Keep fewer messages for better performance
      { role: 'user' as const, content: userMessage.trim() }
    ];

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

      // Try with retry logic
      await this.makeRequestWithRetry(userMessage, messages, session, callbacks);

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Streaming request aborted');
        return;
      }
      
      console.error('Streaming LLM service error:', error);
      callbacks.onError(error instanceof Error ? error : new Error('Unknown streaming error'));
    }
  }

  private async makeRequestWithRetry(
    userMessage: string,
    messages: any[],
    session: any,
    callbacks: StreamingResponse,
    retryCount = 0
  ): Promise<void> {
    const maxRetries = 3;
    const baseDelay = 1000;

    try {
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
          model: 'meta-llama/llama-3.1-8b-instruct:free' // Better model with higher rate limits
        }),
        signal: this.abortController?.signal,
      });

      if (response.status === 429 && retryCount < maxRetries) {
        // Rate limited, retry with exponential backoff
        const delay = baseDelay * Math.pow(2, retryCount) + Math.random() * 1000;
        console.log(`Rate limited, retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.makeRequestWithRetry(userMessage, messages, session, callbacks, retryCount + 1);
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
        throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      await this.processStreamingResponse(response, userMessage, callbacks);

    } catch (error) {
      if (retryCount < maxRetries && error instanceof Error && 
          (error.message.includes('429') || error.message.includes('Rate limit'))) {
        const delay = baseDelay * Math.pow(2, retryCount) + Math.random() * 1000;
        console.log(`Request failed with rate limit, retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.makeRequestWithRetry(userMessage, messages, session, callbacks, retryCount + 1);
      }
      throw error;
    }
  }

  private async processStreamingResponse(
    response: Response,
    userMessage: string,
    callbacks: StreamingResponse
  ): Promise<void> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response stream available');
    }

    const decoder = new TextDecoder();
    let fullResponse = '';
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        
        // Process complete lines
        let lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              if (parsed.choices?.[0]?.delta?.content) {
                const content = parsed.choices[0].delta.content;
                fullResponse += content;
                callbacks.onChunk(content);
              }
            } catch (e) {
              // Only log substantial chunks to reduce noise
              if (data.length > 20) {
                console.warn('Skipped malformed chunk:', data.substring(0, 100) + (data.length > 100 ? '...' : ''));
              }
            }
          }
        }
      }

      // Process any remaining buffer content
      if (buffer.trim()) {
        const finalLines = buffer.split('\n');
        for (const line of finalLines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data && data !== '[DONE]') {
              try {
                const parsed = JSON.parse(data);
                if (parsed.choices?.[0]?.delta?.content) {
                  const content = parsed.choices[0].delta.content;
                  fullResponse += content;
                  callbacks.onChunk(content);
                }
              } catch (e) {
                // Ignore parsing errors for final cleanup
              }
            }
          }
        }
      }

      // Add messages to history
      this.conversationHistory.push({ role: 'user', content: userMessage.trim() });
      this.conversationHistory.push({ role: 'assistant', content: fullResponse });

      callbacks.onComplete(fullResponse);

    } finally {
      reader.releaseLock();
    }
  }

  private getSystemContext(): string {
    const currentDate = new Date();
    const currentTime = currentDate.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });

    return `You are MJAK, a helpful AI assistant. 

Current date and time: ${currentTime}

Important instructions:
- You can provide current time and date information as shown above
- For location-based queries, you can help with general location services
- Only discuss Spotify-related topics when the user explicitly asks about Spotify, music, playlists, or audio content
- Be conversational and helpful
- Keep responses concise but informative
- If asked about your name, you are MJAK

Remember: You have access to current time information and should use it to answer time-related questions accurately.`;
  }

  stopStreaming() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  clearHistory() {
    this.conversationHistory = [];
  }

  getHistory(): StreamingMessage[] {
    return [...this.conversationHistory];
  }
}

export const streamingLLMService = new StreamingLLMService();
