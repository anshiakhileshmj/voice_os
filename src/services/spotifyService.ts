import { supabase } from '@/integrations/supabase/client';
import { spotifyWebPlaybackService } from './spotifyWebPlaybackService';

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
  followers?: { total: number };
  images?: Array<{ url: string; height: number; width: number }>;
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string;
  tracks: { total: number };
  public: boolean;
  collaborative: boolean;
  owner: { id: string };
}

export interface SpotifyArtist {
  id: string;
  name: string;
  genres: string[];
  popularity: number;
  followers: { total: number };
  images: Array<{ url: string; height: number; width: number }>;
}

export class SpotifyService {
  private static readonly SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
  private static readonly REDIRECT_URI = window.location.origin + '/app';
  private static readonly SCOPES = [
    'user-read-private',
    'user-read-email',
    'user-read-playback-state',
    'user-modify-playback-state',
    'streaming',
    'playlist-read-private',
    'playlist-read-collaborative',
    'user-top-read',
    'user-library-read'
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
      
      // Fetch and store user data after successful authentication
      await this.fetchAndStoreUserData();
      
      // Initialize Web Playback SDK
      await this.initializeWebPlayer();
      
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

  async fetchAndStoreUserData(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const profile = await this.getUserProfile();
      
      // Store user profile
      await supabase
        .from('spotify_profiles')
        .upsert({
          user_id: user.id,
          spotify_user_id: profile.id,
          display_name: profile.display_name,
          email: profile.email,
          country: profile.country,
          product: profile.product,
          followers_count: profile.followers?.total || 0,
          profile_image_url: profile.images?.[0]?.url || null,
          updated_at: new Date().toISOString()
        });

      // Fetch and store playlists
      await this.fetchAndStorePlaylists(user.id);
      
      // Fetch and store top artists
      await this.fetchAndStoreTopArtists(user.id);
      
      // Fetch and store top tracks
      await this.fetchAndStoreTopTracks(user.id);

      console.log('User data fetched and stored successfully');
    } catch (error) {
      console.error('Error fetching and storing user data:', error);
    }
  }

  async fetchAndStorePlaylists(userId: string): Promise<void> {
    const accessToken = await this.getValidAccessToken();
    if (!accessToken) return;

    const response = await fetch('https://api.spotify.com/v1/me/playlists?limit=50', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) return;

    const data = await response.json();
    const playlists = data.items || [];

    for (const playlist of playlists) {
      await supabase
        .from('spotify_playlists')
        .upsert({
          user_id: userId,
          spotify_playlist_id: playlist.id,
          name: playlist.name,
          description: playlist.description || '',
          track_count: playlist.tracks.total,
          is_public: playlist.public,
          is_collaborative: playlist.collaborative,
          owner_id: playlist.owner.id,
          updated_at: new Date().toISOString()
        });
    }
  }

  async fetchAndStoreTopArtists(userId: string): Promise<void> {
    const accessToken = await this.getValidAccessToken();
    if (!accessToken) return;

    const response = await fetch('https://api.spotify.com/v1/me/top/artists?limit=50', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) return;

    const data = await response.json();
    const artists = data.items || [];

    for (const artist of artists) {
      await supabase
        .from('spotify_artists')
        .upsert({
          user_id: userId,
          spotify_artist_id: artist.id,
          name: artist.name,
          genres: artist.genres,
          popularity: artist.popularity,
          followers_count: artist.followers.total,
          image_url: artist.images?.[0]?.url || null
        });
    }
  }

  async fetchAndStoreTopTracks(userId: string): Promise<void> {
    const accessToken = await this.getValidAccessToken();
    if (!accessToken) return;

    const response = await fetch('https://api.spotify.com/v1/me/top/tracks?limit=50', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) return;

    const data = await response.json();
    const tracks = data.items || [];

    for (const track of tracks) {
      await supabase
        .from('spotify_tracks')
        .upsert({
          user_id: userId,
          spotify_track_id: track.id,
          name: track.name,
          artist_names: track.artists.map((a: any) => a.name).join(', '),
          album_name: track.album.name,
          duration_ms: track.duration_ms,
          popularity: track.popularity,
          preview_url: track.preview_url,
          image_url: track.album.images?.[0]?.url || null
        });
    }
  }

  async initializeWebPlayer(): Promise<void> {
    const accessToken = await this.getValidAccessToken();
    if (!accessToken) return;

    try {
      const webPlayer = await spotifyWebPlaybackService.initializePlayer(accessToken);
      if (webPlayer) {
        console.log('Spotify Web Player initialized:', webPlayer.device_id);
      }
    } catch (error) {
      console.error('Failed to initialize web player:', error);
    }
  }

  async getStoredUserProfile(): Promise<any> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase
      .from('spotify_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    return data;
  }

  async getStoredPlaylists(): Promise<any[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data } = await supabase
      .from('spotify_playlists')
      .select('*')
      .eq('user_id', user.id);

    return data || [];
  }

  async getStoredTopArtists(): Promise<any[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data } = await supabase
      .from('spotify_artists')
      .select('*')
      .eq('user_id', user.id);

    return data || [];
  }

  async getStoredTopTracks(): Promise<any[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data } = await supabase
      .from('spotify_tracks')
      .select('*')
      .eq('user_id', user.id);

    return data || [];
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

      // Get devices (including web player if available)
      let devices = await this.getDevices();
      
      // Add web player device if available
      const webPlayerDeviceId = spotifyWebPlaybackService.getDeviceId();
      if (webPlayerDeviceId && spotifyWebPlaybackService.isPlayerReady()) {
        devices.unshift({
          id: webPlayerDeviceId,
          name: 'Voice OS Web Player',
          type: 'Computer',
          is_active: false
        });
      }
      
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
