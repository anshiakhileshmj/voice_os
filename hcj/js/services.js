
// LLM Service
class LLMService {
  async generateResponse(userMessage, conversationHistory = []) {
    if (!userMessage.trim()) {
      throw new Error('Message cannot be empty.');
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('User not authenticated');
      }

      const response = await fetch(`${SUPABASE_URL}/functions/v1/llm-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': SUPABASE_ANON_KEY,
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
      return {
        response: result.response,
        updatedHistory: result.updatedHistory
      };
    } catch (error) {
      console.error('LLM service error:', error);
      throw error;
    }
  }
}

// Text-to-Speech Service
class TextToSpeechService {
  async convertTextToSpeech(text, voiceId = 'JBFqnCBsd6RMkjVDRZzb') {
    if (!text.trim()) {
      throw new Error('Text cannot be empty.');
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('User not authenticated');
      }

      const response = await fetch(`${SUPABASE_URL}/functions/v1/text-to-speech`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          text: text.trim(),
          voiceId,
          modelId: 'eleven_multilingual_v2',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to convert text to speech');
      }

      return await response.arrayBuffer();
    } catch (error) {
      console.error('Text-to-speech conversion error:', error);
      throw error;
    }
  }

  async playAudio(audioBuffer) {
    try {
      const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      
      return new Promise((resolve, reject) => {
        audio.onended = () => {
          URL.revokeObjectURL(url);
          resolve();
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error('Audio playback failed'));
        };
        audio.play().catch(reject);
      });
    } catch (error) {
      console.error('Audio playback error:', error);
      throw error;
    }
  }
}

// Automate Service
class AutomateService {
  constructor() {
    this.baseUrl = 'http://localhost:8000';
    this.isConnected = false;
  }

  async checkConnection() {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      this.isConnected = response.ok;
      return this.isConnected;
    } catch (error) {
      console.error('Automate service connection failed:', error);
      this.isConnected = false;
      return false;
    }
  }

  async executeActions(request) {
    try {
      const response = await fetch(`${this.baseUrl}/automate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || 'Failed to execute automation');
      }

      return await response.json();
    } catch (error) {
      console.error('Automation execution failed:', error);
      return {
        success: false,
        message: 'Failed to execute automation',
        error: error.message
      };
    }
  }
}

// Initialize services
window.LLMService = new LLMService();
window.TextToSpeechService = new TextToSpeechService();
window.AutomateService = new AutomateService();
