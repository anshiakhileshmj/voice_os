
declare namespace Spotify {
  interface Player {
    new(options: {
      name: string;
      getOAuthToken: (cb: (token: string) => void) => void;
      volume?: number;
    }): Player;
    
    addListener(event: 'ready', cb: (device: { device_id: string }) => void): void;
    addListener(event: 'not_ready', cb: (device: { device_id: string }) => void): void;
    addListener(event: 'player_state_changed', cb: (state: PlaybackState | null) => void): void;
    addListener(event: 'initialization_error', cb: (error: { message: string }) => void): void;
    addListener(event: 'authentication_error', cb: (error: { message: string }) => void): void;
    addListener(event: 'account_error', cb: (error: { message: string }) => void): void;
    addListener(event: 'playback_error', cb: (error: { message: string }) => void): void;
    
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
  }

  interface PlaybackState {
    context: {
      uri: string;
      metadata: any;
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
    id: string;
    uri: string;
    name: string;
    artists: Artist[];
    album: Album;
    duration_ms: number;
  }

  interface Artist {
    name: string;
    uri: string;
  }

  interface Album {
    name: string;
    uri: string;
    images: Image[];
  }

  interface Image {
    url: string;
    height: number;
    width: number;
  }
}
