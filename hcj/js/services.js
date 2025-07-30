
// Services for the application
class LLMService {
  async generateResponse(userMessage, conversationHistory = []) {
    if (!userMessage.trim()) {
      throw new Error('Message cannot be empty.');
    }

    try {
      console.log('Generating LLM response for:', userMessage.substring(0, 50) + '...');
      
      const session = await window.SupabaseClient.auth.getSession();
      if (!session.data.session) {
        throw new Error('User not authenticated');
      }

      const response = await fetch('https://uasluhbtcpuigwkuslum.supabase.co/functions/v1/llm-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.data.session.access_token}`,
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
        updatedHistory: result.updatedHistory
      };
    } catch (error) {
      console.error('LLM service error:', error);
      throw new Error(`Failed to generate LLM response: ${error.message}`);
    }
  }
}

class TextToSpeechService {
  async convertTextToSpeech(text, voiceId = 'JBFqnCBsd6RMkjVDRZzb', modelId = 'eleven_multilingual_v2') {
    if (!text.trim()) {
      throw new Error('Text cannot be empty.');
    }

    try {
      console.log('Converting text to speech:', text.substring(0, 50) + '...');
      
      const session = await window.SupabaseClient.auth.getSession();
      if (!session.data.session) {
        throw new Error('User not authenticated');
      }

      const response = await fetch('https://uasluhbtcpuigwkuslum.supabase.co/functions/v1/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.data.session.access_token}`,
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhc2x1aGJ0Y3B1aWd3a3VzbHVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzNDkwOTUsImV4cCI6MjA2NjkyNTA5NX0.hmdgaWm1-Xso9ZIQHiVSWcuPEfu4qmat-YR1qoYAFAs',
        },
        body: JSON.stringify({
          text: text.trim(),
          voiceId,
          modelId,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
        throw new Error(error.error || 'Failed to convert text to speech');
      }

      const arrayBuffer = await response.arrayBuffer();
      
      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        throw new Error('No audio data received from text-to-speech service');
      }

      console.log('Successfully received audio data:', arrayBuffer.byteLength, 'bytes');
      return arrayBuffer;
    } catch (error) {
      console.error('Text-to-speech conversion error:', error);
      throw new Error(`Failed to convert text to speech: ${error.message}`);
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
      throw new Error('Failed to play audio');
    }
  }
}

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

  async generateActions(objective) {
    try {
      const response = await fetch(`${this.baseUrl}/generate-actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ objective }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || 'Failed to generate actions');
      }

      const result = await response.json();
      return result.actions || [];
    } catch (error) {
      console.error('Action generation failed:', error);
      throw new Error('Failed to generate automation actions');
    }
  }
}

class DocumentService {
  async uploadDocument(file, userId) {
    try {
      const content = await this.extractTextFromFile(file);
      
      const { data, error } = await window.SupabaseClient
        .from('document_uploads')
        .insert({
          user_id: userId,
          filename: file.name,
          file_type: file.type,
          file_size: file.size,
          file_content: content
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Document upload error:', error);
      throw error;
    }
  }

  async getUserDocuments(userId) {
    try {
      const { data, error } = await window.SupabaseClient
        .from('document_uploads')
        .select('*')
        .eq('user_id', userId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Get documents error:', error);
      throw error;
    }
  }

  async processDocument(documentId, action, question) {
    try {
      const session = await window.SupabaseClient.auth.getSession();
      if (!session.data.session) {
        throw new Error('User not authenticated');
      }

      const response = await fetch('https://uasluhbtcpuigwkuslum.supabase.co/functions/v1/process-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.data.session.access_token}`,
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhc2x1aGJ0Y3B1aWd3a3VzbHVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzNDkwOTUsImV4cCI6MjA2NjkyNTA5NX0.hmdgaWm1-Xso9ZIQHiVSWcuPEfu4qmat-YR1qoYAFAs',
        },
        body: JSON.stringify({
          documentId,
          action,
          question
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to process document');
      }

      const result = await response.json();
      return result.result;
    } catch (error) {
      console.error('Document processing error:', error);
      throw error;
    }
  }

  async extractTextFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const content = e.target.result;
        
        if (file.type === 'text/plain') {
          resolve(content);
        } else if (file.type === 'application/pdf') {
          resolve(content);
        } else {
          resolve(content);
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      
      if (file.type === 'application/pdf') {
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file);
      }
    });
  }
}

class SpotifyService {
  constructor() {
    this.SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
    this.REDIRECT_URI = 'https://s2s.lovable.app';
    this.SCOPES = [
      'user-read-private',
      'user-read-email',
      'user-modify-playback-state',
      'user-read-playback-state',
      'streaming'
    ].join(' ');
  }

  async initiateAuth() {
    const state = this.generateRandomString(16);
    localStorage.setItem('spotify_auth_state', state);

    const clientId = await this.getClientId();
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      scope: this.SCOPES,
      redirect_uri: this.REDIRECT_URI,
      state: state,
    });

    window.location.href = `${this.SPOTIFY_AUTH_URL}?${params}`;
  }

  async isConnected() {
    const tokens = await this.getTokens();
    return tokens !== null;
  }

  async searchTrack(query) {
    const accessToken = await this.getValidAccessToken();
    if (!accessToken) throw new Error('Not authenticated');

    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=1`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to search track');
    }

    const data = await response.json();
    const tracks = data.tracks?.items || [];
    
    if (tracks.length === 0) return null;

    const track = tracks[0];
    return {
      uri: track.uri,
      name: track.name,
      artist: track.artists[0]?.name || 'Unknown Artist',
    };
  }

  async playTrack(trackUri, deviceId) {
    const accessToken = await this.getValidAccessToken();
    if (!accessToken) throw new Error('Not authenticated');

    const body = { uris: [trackUri] };
    if (deviceId) body.device_id = deviceId;

    const response = await fetch('https://api.spotify.com/v1/me/player/play', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || 'Failed to play track');
    }
  }

  async getValidAccessToken() {
    const tokens = await this.getTokens();
    if (!tokens) return null;

    if (Date.now() >= tokens.expires_at) {
      const refreshedTokens = await this.refreshTokens(tokens.refresh_token);
      if (!refreshedTokens) return null;
      await this.saveTokens(refreshedTokens);
      return refreshedTokens.access_token;
    }

    return tokens.access_token;
  }

  async getTokens() {
    const tokensStr = localStorage.getItem('spotify_tokens');
    if (!tokensStr) return null;

    try {
      return JSON.parse(tokensStr);
    } catch {
      return null;
    }
  }

  async saveTokens(tokens) {
    localStorage.setItem('spotify_tokens', JSON.stringify(tokens));
  }

  async getClientId() {
    const response = await fetch('https://uasluhbtcpuigwkuslum.supabase.co/functions/v1/spotify-auth/client-id');
    const data = await response.json();
    return data.client_id;
  }

  generateRandomString(length) {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const values = crypto.getRandomValues(new Uint8Array(length));
    return values.reduce((acc, x) => acc + possible[x % possible.length], '');
  }
}

class LocationService {
  async getUserLocation() {
    try {
      const response = await fetch('https://ipapi.co/json/');
      
      if (!response.ok) {
        throw new Error('Failed to get location data');
      }

      const data = await response.json();
      
      return {
        ip: data.ip || '',
        city: data.city || 'Unknown',
        region: data.region || 'Unknown',
        region_code: data.region_code || '',
        country: data.country_name || 'Unknown',
        country_code: data.country_code || '',
        continent: data.continent_code || '',
        postal: data.postal || '',
        latitude: data.latitude || 0,
        longitude: data.longitude || 0,
        timezone: data.timezone || 'UTC',
        utc_offset: data.utc_offset || '+0000',
        in_eu: data.in_eu || false,
        calling_code: data.country_calling_code || '',
        capital: data.country_capital || '',
        country_tld: data.country_tld || '',
        currency: data.currency || '',
        currency_name: data.currency_name || '',
        languages: data.languages || '',
        country_area: data.country_area || 0,
        country_population: data.country_population || 0,
        asn: data.asn || '',
        org: data.org || '',
        hostname: data.hostname || ''
      };
    } catch (error) {
      console.error('Location service error:', error);
      return {
        ip: '',
        city: 'Unknown',
        region: 'Unknown',
        region_code: '',
        country: 'Unknown',
        country_code: '',
        continent: '',
        postal: '',
        latitude: 0,
        longitude: 0,
        timezone: 'UTC',
        utc_offset: '+0000',
        in_eu: false,
        calling_code: '',
        capital: '',
        country_tld: '',
        currency: '',
        currency_name: '',
        languages: '',
        country_area: 0,
        country_population: 0,
        asn: '',
        org: '',
        hostname: ''
      };
    }
  }

  getGreeting(timezone, userName) {
    try {
      const now = new Date().toLocaleString("en-US", { timeZone: timezone });
      const hour = new Date(now).getHours();
      
      if (hour >= 5 && hour < 12) return `Good morning, ${userName}`;
      if (hour >= 12 && hour < 17) return `Good afternoon, ${userName}`;
      if (hour >= 17 && hour < 21) return `Good evening, ${userName}`;
      return `Hello, ${userName}`;
    } catch (error) {
      return `Hello, ${userName}`;
    }
  }
}

// Initialize services
window.LLMService = new LLMService();
window.TextToSpeechService = new TextToSpeechService();
window.AutomateService = new AutomateService();
window.DocumentService = new DocumentService();
window.SpotifyService = new SpotifyService();
window.LocationService = new LocationService();
