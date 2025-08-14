
import { spotifyService } from './spotifyService';

export class SpotifyWebPlaybackService {
  private player: Spotify.Player | null = null;
  private deviceId: string | null = null;
  private isReady = false;

  async initializePlayer(): Promise<boolean> {
    try {
      // Load Spotify Web Playback SDK
      if (!window.Spotify) {
        await this.loadSpotifySDK();
      }

      if (this.player) {
        return this.isReady;
      }

      const profile = await spotifyService.getUserProfile();
      if (profile.product !== 'premium') {
        throw new Error('Spotify Premium is required for Web Playback');
      }

      return new Promise((resolve, reject) => {
        this.player = new window.Spotify.Player({
          name: 'MJAK Voice Assistant',
          getOAuthToken: async (cb) => {
            try {
              const accessToken = await this.getAccessToken();
              if (accessToken) {
                cb(accessToken);
              } else {
                reject(new Error('Failed to get access token'));
              }
            } catch (error) {
              reject(error);
            }
          },
          volume: 0.5
        });

        // Error handling
        this.player.addListener('initialization_error', ({ message }) => {
          console.error('Spotify Player initialization error:', message);
          reject(new Error(message));
        });

        this.player.addListener('authentication_error', ({ message }) => {
          console.error('Spotify Player authentication error:', message);
          reject(new Error(message));
        });

        this.player.addListener('account_error', ({ message }) => {
          console.error('Spotify Player account error:', message);
          reject(new Error(message));
        });

        this.player.addListener('playback_error', ({ message }) => {
          console.error('Spotify Player playback error:', message);
        });

        // Ready
        this.player.addListener('ready', ({ device_id }) => {
          console.log('Spotify Player ready with Device ID:', device_id);
          this.deviceId = device_id;
          this.isReady = true;
          resolve(true);
        });

        this.player.addListener('not_ready', ({ device_id }) => {
          console.log('Spotify Player not ready with Device ID:', device_id);
          this.isReady = false;
        });

        // State changes
        this.player.addListener('player_state_changed', (state) => {
          if (!state) return;
          
          console.log('Player state changed:', {
            track: state.track_window.current_track,
            paused: state.paused,
            position: state.position
          });
        });

        // Connect to the player
        this.player.connect().then((success) => {
          if (!success) {
            reject(new Error('Failed to connect to Spotify Player'));
          }
        });
      });
    } catch (error) {
      console.error('Failed to initialize Spotify Web Player:', error);
      throw error;
    }
  }

  private async loadSpotifySDK(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.Spotify) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://sdk.scdn.co/spotify-player.js';
      script.async = true;

      script.onload = () => {
        window.onSpotifyWebPlaybackSDKReady = () => {
          resolve();
        };
      };

      script.onerror = () => {
        reject(new Error('Failed to load Spotify Web Playback SDK'));
      };

      document.head.appendChild(script);
    });
  }

  private async getAccessToken(): Promise<string | null> {
    try {
      // Use the existing spotifyService method to get valid access token
      const tokens = await spotifyService.getTokens();
      if (!tokens) return null;

      // Check if token is expired (with 1 minute buffer)
      if (Date.now() >= (tokens.expires_at - 60000)) {
        const refreshedTokens = await spotifyService.refreshTokens(tokens.refresh_token);
        if (refreshedTokens) {
          await spotifyService.saveTokens(refreshedTokens);
          return refreshedTokens.access_token;
        }
        return null;
      }

      return tokens.access_token;
    } catch (error) {
      console.error('Failed to get access token:', error);
      return null;
    }
  }

  async playTrack(trackUri: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.isReady || !this.deviceId) {
        // Try to initialize if not ready
        await this.initializePlayer();
        if (!this.isReady || !this.deviceId) {
          return { success: false, error: 'Player not ready' };
        }
      }

      const accessToken = await this.getAccessToken();
      if (!accessToken) {
        return { success: false, error: 'No access token' };
      }

      // Transfer playback to our device first
      await fetch(`https://api.spotify.com/v1/me/player`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          device_ids: [this.deviceId],
          play: false
        })
      });

      // Wait a moment for transfer
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Start playback
      const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${this.deviceId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          uris: [trackUri]
        })
      });

      if (response.ok || response.status === 204) {
        return { success: true };
      } else {
        const error = await response.text();
        return { success: false, error: `Playback failed: ${error}` };
      }
    } catch (error) {
      console.error('Web player playback error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async pause(): Promise<void> {
    if (this.player) {
      await this.player.pause();
    }
  }

  async resume(): Promise<void> {
    if (this.player) {
      await this.player.resume();
    }
  }

  async setVolume(volume: number): Promise<void> {
    if (this.player) {
      await this.player.setVolume(volume);
    }
  }

  async getCurrentState(): Promise<Spotify.PlaybackState | null> {
    if (this.player) {
      return await this.player.getCurrentState();
    }
    return null;
  }

  disconnect(): void {
    if (this.player) {
      this.player.disconnect();
      this.player = null;
      this.deviceId = null;
      this.isReady = false;
    }
  }

  getDeviceId(): string | null {
    return this.deviceId;
  }

  isPlayerReady(): boolean {
    return this.isReady;
  }
}

export const spotifyWebPlaybackService = new SpotifyWebPlaybackService();
