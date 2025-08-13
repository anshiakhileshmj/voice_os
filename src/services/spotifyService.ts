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

export interface SpotifyUserProfile {
  id: string;
  display_name: string;
  email: string;
  product: 'free' | 'premium';
  country: string;
}

export class SpotifyService {
  private static readonly SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
  private static readonly REDIRECT_URI = window.location.origin + '/app';
  private static readonly SCOPES = [
    'user-read-private',
    'user-read-email',
    'user-read-playback-state',
    'user-modify-playback-state',
    'streaming'
  ].join(' ');

  async initiateAuth(): Promise<void> {
    console.log('Initiating Spotify auth...');
    
    // Clear any existing auth state first
    localStorage.removeItem('spotify_auth_state');
    
    // Generate a cryptographically secure random state
    const state = this.generateSecureRandomString(128);
    console.log('Generated new state for auth:', state.substring(0, 20) + '...');
    
    // Store state in localStorage with timestamp for cleanup
    const stateData = {
      state: state,
      timestamp: Date.now(),
      redirect_uri: SpotifyService.REDIRECT_URI
    };
    
    localStorage.setItem('spotify_auth_state', JSON.stringify(stateData));
    console.log('Stored state data in localStorage');

    const clientId = await this.getClientId();
    console.log('Using client ID:', clientId);

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      scope: SpotifyService.SCOPES,
      redirect_uri: SpotifyService.REDIRECT_URI,
      state: state,
      show_dialog: 'true'
    });

    const authUrl = `${SpotifyService.SPOTIFY_AUTH_URL}?${params}`;
    console.log('Redirecting to Spotify with state:', state.substring(0, 20) + '...');
    
    // Add a small delay to ensure localStorage is written
    setTimeout(() => {
      window.location.href = authUrl;
    }, 100);
  }

  async handleCallback(code: string, state: string): Promise<boolean> {
    console.log('Handling callback with code:', code?.substring(0, 10) + '...', 'state:', state.substring(0, 20) + '...');
    
    try {
      // Retrieve and validate stored state
      const storedStateJson = localStorage.getItem('spotify_auth_state');
      
      if (!storedStateJson) {
        console.error('No stored state found in localStorage');
        throw new Error('No stored authentication state found. Please try connecting to Spotify again.');
      }

      const stateData = JSON.parse(storedStateJson);
      console.log('Retrieved stored state:', stateData.state.substring(0, 20) + '...');
      console.log('Received state from Spotify:', state.substring(0, 20) + '...');
      console.log('States match:', state === stateData.state);

      // Validate state parameter
      if (state !== stateData.state) {
        console.error('State mismatch - received:', state.substring(0, 20) + '...', 'expected:', stateData.state.substring(0, 20) + '...');
        localStorage.removeItem('spotify_auth_state');
        throw new Error('Authentication state mismatch. Please try connecting to Spotify again.');
      }

      // Check if state is not too old (10 minutes max)
      if (Date.now() - stateData.timestamp > 10 * 60 * 1000) {
        console.error('State expired');
        localStorage.removeItem('spotify_auth_state');
        throw new Error('Authentication session expired. Please try connecting to Spotify again.');
      }

      console.log('State validation successful, exchanging code for tokens...');

      // Use Supabase client to call edge function
      const { data, error } = await supabase.functions.invoke('spotify-auth/token', {
        body: {
          code,
          redirect_uri: SpotifyService.REDIRECT_URI,
        },
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(`Failed to exchange code for tokens: ${error.message}`);
      }

      const tokens: SpotifyTokens = data;
      console.log('Received tokens successfully');
      
      await this.saveTokens(tokens);
      
      // Clean up stored state
      localStorage.removeItem('spotify_auth_state');
      
      console.log('Spotify authentication successful');
      return true;
    } catch (error) {
      console.error('Spotify callback error:', error);
      // Always clean up state on error
      localStorage.removeItem('spotify_auth_state');
      return false;
    }
  }

  async isConnected(): Promise<boolean> {
    const tokens = await this.getTokens();
    return tokens !== null;
  }

  async getUserProfile(): Promise<SpotifyUserProfile> {
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
      if (response.status === 403) {
        throw new Error('Premium subscription required');
      }
      throw new Error('Failed to get devices');
    }

    const data = await response.json();
    return data.devices || [];
  }

  async transferPlayback(deviceId: string): Promise<void> {
    const accessToken = await this.getValidAccessToken();
    if (!accessToken) throw new Error('Not authenticated');

    const response = await fetch('https://api.spotify.com/v1/me/player', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        device_ids: [deviceId],
        play: false
      }),
    });

    if (!response.ok && response.status !== 204) {
      throw new Error('Failed to transfer playback');
    }
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

  async playTrack(trackUri: string, deviceId?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const accessToken = await this.getValidAccessToken();
      if (!accessToken) {
        return { success: false, error: 'Not authenticated' };
      }

      // Check if user has premium
      const profile = await this.getUserProfile();
      if (profile.product !== 'premium') {
        return { success: false, error: 'premium_required' };
      }

      // Get devices
      const devices = await this.getDevices();
      
      if (devices.length === 0) {
        return { success: false, error: 'no_devices' };
      }

      // Find active device or use the first available device
      let targetDevice = devices.find(d => d.is_active);
      
      if (!targetDevice) {
        targetDevice = devices[0];
        // Transfer playback to the first available device
        await this.transferPlayback(targetDevice.id);
        // Wait a bit for the transfer to complete
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      const body: any = { uris: [trackUri] };
      if (deviceId || targetDevice) {
        body.device_id = deviceId || targetDevice.id;
      }

      const response = await fetch('https://api.spotify.com/v1/me/player/play', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (response.ok || response.status === 204) {
        return { success: true };
      }

      if (response.status === 403) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.error?.reason === 'PREMIUM_REQUIRED') {
          return { success: false, error: 'premium_required' };
        }
        return { success: false, error: 'forbidden' };
      }

      if (response.status === 404) {
        return { success: false, error: 'no_active_device' };
      }

      const error = await response.json().catch(() => ({}));
      return { success: false, error: error.error?.message || 'Failed to play track' };

    } catch (error) {
      console.error('Play track error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
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
      
      // Use Supabase client to call edge function
      const { data, error } = await supabase.functions.invoke('spotify-auth/refresh', {
        body: { refresh_token: refreshToken },
      });

      if (error) {
        console.error('Token refresh failed:', error);
        return null;
      }

      console.log('Tokens refreshed successfully');
      return data;
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
      localStorage.removeItem('spotify_tokens');
      return null;
    }
  }

  private async getClientId(): Promise<string> {
    try {
      // Use Supabase client to call edge function
      const { data, error } = await supabase.functions.invoke('spotify-auth/client-id');
      
      if (error || !data?.client_id) {
        console.warn('Failed to get client ID from edge function:', error);
        // Fallback to hardcoded value
        return 'b9cb88208a414f018feac12ebd9821e3';
      }
      
      return data.client_id;
    } catch (error) {
      console.warn('Failed to get client ID from edge function:', error);
      return 'b9cb88208a414f018feac12ebd9821e3';
    }
  }

  private generateSecureRandomString(length: number): string {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
}

export const spotifyService = new SpotifyService();
