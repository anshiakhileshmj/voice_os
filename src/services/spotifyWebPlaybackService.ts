
import { supabase } from '@/integrations/supabase/client';

export interface SpotifyWebPlayer {
  device_id: string;
  ready: boolean;
  player: Spotify.Player | null;
}

export class SpotifyWebPlaybackService {
  private player: Spotify.Player | null = null;
  private deviceId: string | null = null;
  private isReady: boolean = false;

  async initializePlayer(accessToken: string): Promise<SpotifyWebPlayer | null> {
    return new Promise((resolve) => {
      // Load Spotify Web Playback SDK
      if (!window.Spotify) {
        const script = document.createElement('script');
        script.src = 'https://sdk.scdn.co/spotify-player.js';
        script.async = true;
        document.body.appendChild(script);

        window.onSpotifyWebPlaybackSDKReady = () => {
          this.createPlayer(accessToken, resolve);
        };
      } else {
        this.createPlayer(accessToken, resolve);
      }
    });
  }

  private createPlayer(accessToken: string, resolve: (player: SpotifyWebPlayer | null) => void) {
    // Use window.Spotify.Player constructor
    this.player = new (window.Spotify.Player as any)({
      name: 'Voice OS Web Player',
      getOAuthToken: (cb: (token: string) => void) => cb(accessToken),
      volume: 0.5
    });

    // Error handling
    this.player.addListener('initialization_error', ({ message }) => {
      console.error('Failed to initialize:', message);
      resolve(null);
    });

    this.player.addListener('authentication_error', ({ message }) => {
      console.error('Failed to authenticate:', message);
      resolve(null);
    });

    this.player.addListener('account_error', ({ message }) => {
      console.error('Failed to validate Spotify account:', message);
      resolve(null);
    });

    this.player.addListener('playback_error', ({ message }) => {
      console.error('Failed to perform playback:', message);
    });

    // Playback status updates
    this.player.addListener('player_state_changed', (state) => {
      if (!state) return;
      console.log('Player state changed:', state);
    });

    // Ready
    this.player.addListener('ready', ({ device_id }) => {
      console.log('Ready with Device ID', device_id);
      this.deviceId = device_id;
      this.isReady = true;
      resolve({
        device_id,
        ready: true,
        player: this.player
      });
    });

    // Not Ready
    this.player.addListener('not_ready', ({ device_id }) => {
      console.log('Device ID has gone offline', device_id);
      this.isReady = false;
    });

    // Connect to the player!
    this.player.connect();
  }

  getDeviceId(): string | null {
    return this.deviceId;
  }

  isPlayerReady(): boolean {
    return this.isReady && this.player !== null;
  }

  async togglePlayback(): Promise<void> {
    if (!this.player) return;
    await this.player.togglePlay();
  }

  async nextTrack(): Promise<void> {
    if (!this.player) return;
    await this.player.nextTrack();
  }

  async previousTrack(): Promise<void> {
    if (!this.player) return;
    await this.player.previousTrack();
  }

  async setVolume(volume: number): Promise<void> {
    if (!this.player) return;
    await this.player.setVolume(volume);
  }

  async getCurrentState(): Promise<Spotify.PlaybackState | null> {
    if (!this.player) return null;
    return await this.player.getCurrentState();
  }

  disconnect(): void {
    if (this.player) {
      this.player.disconnect();
      this.player = null;
      this.deviceId = null;
      this.isReady = false;
    }
  }
}

export const spotifyWebPlaybackService = new SpotifyWebPlaybackService();

// Declare global Spotify types
declare global {
  interface Window {
    Spotify: typeof Spotify;
    onSpotifyWebPlaybackSDKReady: () => void;
  }
}
