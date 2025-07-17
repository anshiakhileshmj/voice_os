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
  private static readonly REDIRECT_URI = 'https://s2s.lovable.app';
  private static readonly SCOPES = [
    'user-read-private',
    'user-read-email',
    'user-modify-playback-state',
    'user-read-playback-state',
    'streaming'
  ].join(' ');

  async initiateAuth(): Promise<void> {
    const state = this.generateRandomString(16);
    localStorage.setItem('spotify_auth_state', state);

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: await this.getClientId(),
      scope: SpotifyService.SCOPES,
      redirect_uri: SpotifyService.REDIRECT_URI,
      state: state,
    });

    window.location.href = `${SpotifyService.SPOTIFY_AUTH_URL}?${params}`;
  }

  async handleCallback(code: string, state: string): Promise<boolean> {
    const savedState = localStorage.getItem('spotify_auth_state');
    if (state !== savedState) {
      throw new Error('Invalid state parameter');
    }

    try {
      const response = await fetch('https://uasluhbtcpuigwkuslum.supabase.co/functions/v1/spotify-auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          redirect_uri: SpotifyService.REDIRECT_URI,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to exchange code for tokens');
      }

      const tokens: SpotifyTokens = await response.json();
      await this.saveTokens(tokens);
      localStorage.removeItem('spotify_auth_state');
      
      return true;
    } catch (error) {
      console.error('Spotify callback error:', error);
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

    // Check if token is expired
    if (Date.now() >= tokens.expires_at) {
      const refreshedTokens = await this.refreshTokens(tokens.refresh_token);
      if (!refreshedTokens) return null;
      await this.saveTokens(refreshedTokens);
      return refreshedTokens.access_token;
    }

    return tokens.access_token;
  }

  private async refreshTokens(refreshToken: string): Promise<SpotifyTokens | null> {
    try {
      const response = await fetch('https://uasluhbtcpuigwkuslum.supabase.co/functions/v1/spotify-auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) return null;

      return response.json();
    } catch (error) {
      console.error('Token refresh error:', error);
      return null;
    }
  }

  private async saveTokens(tokens: SpotifyTokens): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    localStorage.setItem('spotify_tokens', JSON.stringify(tokens));
  }

  private async getTokens(): Promise<SpotifyTokens | null> {
    const tokensStr = localStorage.getItem('spotify_tokens');
    if (!tokensStr) return null;

    try {
      return JSON.parse(tokensStr);
    } catch {
      return null;
    }
  }

  private async getClientId(): Promise<string> {
    const response = await fetch('https://uasluhbtcpuigwkuslum.supabase.co/functions/v1/spotify-auth/client-id');
    const data = await response.json();
    return data.client_id;
  }

  private generateRandomString(length: number): string {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const values = crypto.getRandomValues(new Uint8Array(length));
    return values.reduce((acc, x) => acc + possible[x % possible.length], '');
  }
}

export const spotifyService = new SpotifyService();