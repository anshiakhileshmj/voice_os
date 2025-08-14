
declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady: () => void;
    Spotify: typeof Spotify;
  }
}

declare namespace Spotify {
  interface PlaybackState {
    context: {
      uri: string;
      metadata?: any;
    };
    disallows: {
      pausing: boolean;
      peeking_next: boolean;
      peeking_prev: boolean;
      resuming: boolean;
      seeking: boolean;
      skipping_next: boolean;
      skipping_prev: boolean;
    };
    paused: boolean;
    position: number;
    repeat_mode: number;
    shuffle: boolean;
    track_window: {
      current_track: Track;
      next_tracks: Track[];
      previous_tracks: Track[];
    };
  }

  interface Track {
    uri: string;
    id: string;
    type: 'track' | 'episode' | 'ad';
    media_type: 'audio' | 'video';
    name: string;
    is_playable: boolean;
    album: {
      uri: string;
      name: string;
      images: Array<{ url: string }>;
    };
    artists: Array<{ uri: string; name: string }>;
  }

  interface Device {
    device_id: string;
  }

  interface Player {
    new (options: {
      name: string;
      getOAuthToken: (cb: (token: string) => void) => void;
      volume?: number;
    }): Player;

    addListener(event: 'ready', cb: (device: Device) => void): boolean;
    addListener(event: 'not_ready', cb: (device: Device) => void): boolean;
    addListener(event: 'player_state_changed', cb: (state: PlaybackState | null) => void): boolean;
    addListener(event: 'initialization_error', cb: (error: { message: string }) => void): boolean;
    addListener(event: 'authentication_error', cb: (error: { message: string }) => void): boolean;
    addListener(event: 'account_error', cb: (error: { message: string }) => void): boolean;
    addListener(event: 'playback_error', cb: (error: { message: string }) => void): boolean;

    removeListener(event: string, cb?: Function): boolean;

    connect(): Promise<boolean>;
    disconnect(): void;
    getCurrentState(): Promise<PlaybackState | null>;
    setName(name: string): Promise<void>;
    getVolume(): Promise<number>;
    setVolume(volume: number): Promise<void>;
    pause(): Promise<void>;
    resume(): Promise<void>;
    togglePlay(): Promise<void>;
    seek(position_ms: number): Promise<void>;
    previousTrack(): Promise<void>;
    nextTrack(): Promise<void>;
    activateElement(): Promise<void>;
  }
}

export {};
