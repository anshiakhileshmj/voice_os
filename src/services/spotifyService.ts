
import { supabase } from '@/integrations/supabase/client';

export interface SpotifyTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export interface SpotifyDevice {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
}

export interface SpotifyTrack {
  uri: string;
  name: string;
  artist: string;
}

export class SpotifyService {
  private static readonly SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
  private static readonly REDIRECT_URI = window.location.origin + '/app';
  private static readonly SCOPES = [
    'user-read-private',
    'user-read-email',
    'user-modify-playback-state',
    'user-read-playback-state',
    'streaming'
  ].join(' ');

  async initiateAuth(): Promise<void> {
    console.log('Initiating Spotify auth...');
    
    // Generate a cryptographically secure random state
    const state = this.generateSecureRandomString(128);
    console.log('Generated state:', state);
    
    // Store state in localStorage with timestamp for cleanup
    const stateData = {
      state: state,
      timestamp: Date.now(),
      redirect_uri: SpotifyService.REDIRECT_URI
    };
    
    localStorage.setItem('spotify_auth_state', JSON.stringify(stateData));
    console.log('Stored state data:', stateData);

    const clientId = await this.getClientId();
    console.log('Using client ID:', clientId);

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      scope: SpotifyService.SCOPES,
      redirect_uri: SpotifyService.REDIRECT_URI,
      state: state,
      show_dialog: 'true' // Force user to approve app each time for debugging
    });

    const authUrl = `${SpotifyService.SPOTIFY_AUTH_URL}?${params}`;
    console.log('Redirecting to:', authUrl);
    
    window.location.href = authUrl;
  }

  async handleCallback(code: string, state: string): Promise<boolean> {
    console.log('Handling callback with code:', code?.substring(0, 10) + '...', 'state:', state);
    
    try {
      // Retrieve and validate stored state
      const storedStateJson = localStorage.getItem('spotify_auth_state');
      
      if (!storedStateJson) {
        console.error('No stored state found in localStorage');
        throw new Error('No stored authentication state found');
      }

      const stateData = JSON.parse(storedStateJson);
      console.log('Retrieved state data:', stateData);

      // Validate state parameter
      if (state !== stateData.state) {
        console.error('State mismatch - received:', state, 'expected:', stateData.state);
        throw new Error('Invalid state parameter - possible CSRF attack');
      }

      // Check if state is not too old (10 minutes max)
      if (Date.now() - stateData.timestamp > 10 * 60 * 1000) {
        console.error('State expired');
        throw new Error('Authentication state expired');
      }

      console.log('State validation successful, exchanging code for tokens...');

      // Exchange code for tokens
      const response = await fetch('https://uasluhbtcpuigwkuslum.supabase.co/functions/v1/spotify-auth/token', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          code,
          redirect_uri: SpotifyService.REDIRECT_URI,
        }),
      });

      console.log('Token exchange response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Token exchange failed:', errorText);
        throw new Error(`Failed to exchange code for tokens: ${response.status} ${errorText}`);
      }

      const tokens: SpotifyTokens = await response.json();
      console.log('Received tokens:', { ...tokens, access_token: tokens.access_token?.substring(0, 20) + '...' });
      
      await this.saveTokens(tokens);
      localStorage.removeItem('spotify_auth_state');
      
      console.log('Spotify authentication successful');
      return true;
    } catch (error) {
      console.error('Spotify callback error:', error);
      localStorage.removeItem('spotify_auth_state'); // Clean up on error
      return false;
    }
  }

  async isConnected(): Promise<boolean> {
    const tokens = await this.getTokens();
    return tokens !== null;
  }

  async getUserProfile(): Promise<any> {
    const accessToken = await this.getValidAccessToken();
    if (!accessToken) throw new Error('Not authenticated');

    const response = await fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error('Failed to get user profile');
    }

    return response.json();
  }

  async getDevices(): Promise<SpotifyDevice[]> {
    const accessToken = await this.getValidAccessToken();
    if (!accessToken) throw new Error('Not authenticated');

    const response = await fetch('https://api.spotify.com/v1/me/player/devices', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error('Failed to get devices');
    }

    const data = await response.json();
    return data.devices || [];
  }

  async searchTrack(query: string): Promise<SpotifyTrack | null> {
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

  async playTrack(trackUri: string, deviceId?: string): Promise<void> {
    const accessToken = await this.getValidAccessToken();
    if (!accessToken) throw new Error('Not authenticated');

    const body: any = { uris: [trackUri] };
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

  private async getValidAccessToken(): Promise<string | null> {
    const tokens = await this.getTokens();
    if (!tokens) return null;

    // Check if token is expired (with 1 minute buffer)
    if (Date.now() >= (tokens.expires_at - 60000)) {
      console.log('Token expired, refreshing...');
      const refreshedTokens = await this.refreshTokens(tokens.refresh_token);
      if (!refreshedTokens) return null;
      await this.saveTokens(refreshedTokens);
      return refreshedTokens.access_token;
    }

    return tokens.access_token;
  }

  private async refreshTokens(refreshToken: string): Promise<SpotifyTokens | null> {
    try {
      console.log('Refreshing tokens...');
      const response = await fetch('https://uasluhbtcpuigwkuslum.supabase.co/functions/v1/spotify-auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        console.error('Token refresh failed:', response.status);
        return null;
      }

      const tokens = await response.json();
      console.log('Tokens refreshed successfully');
      return tokens;
    } catch (error) {
      console.error('Token refresh error:', error);
      return null;
    }
  }

  private async saveTokens(tokens: SpotifyTokens): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Store in localStorage for immediate access
    localStorage.setItem('spotify_tokens', JSON.stringify(tokens));
    console.log('Tokens saved to localStorage');
  }

  private async getTokens(): Promise<SpotifyTokens | null> {
    const tokensStr = localStorage.getItem('spotify_tokens');
    if (!tokensStr) return null;

    try {
      return JSON.parse(tokensStr);
    } catch {
      localStorage.removeItem('spotify_tokens'); // Clean up corrupted data
      return null;
    }
  }

  private async getClientId(): Promise<string> {
    // Try to get client ID from Supabase Edge Function first
    try {
      const response = await fetch('https://uasluhbtcpuigwkuslum.supabase.co/functions/v1/spotify-auth/client-id');
      if (response.ok) {
        const data = await response.json();
        if (data?.client_id) return data.client_id as string;
      }
    } catch (error) {
      console.warn('Failed to get client ID from edge function:', error);
    }

    // Fallback to environment variable or hardcoded value
    const envClientId = (import.meta as any)?.env?.VITE_SPOTIFY_CLIENT_ID as string | undefined;
    return envClientId || 'b9cb88208a414f018feac12ebd9821e3';
  }

  private generateSecureRandomString(length: number): string {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
}

export const spotifyService = new SpotifyService();
