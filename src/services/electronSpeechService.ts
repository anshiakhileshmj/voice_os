
import { useToast } from '@/hooks/use-toast';

export interface ElectronSpeechConfig {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onResult: (transcript: string) => void;
  onError: (error: string) => void;
  onStart: () => void;
  onEnd: () => void;
}

export class ElectronSpeechService {
  private recognition: SpeechRecognition | null = null;
  private config: ElectronSpeechConfig;
  private isElectron: boolean;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;

  constructor(config: ElectronSpeechConfig) {
    this.config = config;
    this.isElectron = this.detectElectron();
    this.initializeRecognition();
  }

  private detectElectron(): boolean {
    return !!(window as any).require || 
           !!(window as any).electron || 
           navigator.userAgent.toLowerCase().includes('electron');
  }

  private async requestMicrophoneAccess(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.error('Microphone access denied:', error);
      return false;
    }
  }

  private initializeRecognition(): void {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      this.config.onError('Speech recognition not supported');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.setupRecognitionHandlers();
  }

  private setupRecognitionHandlers(): void {
    if (!this.recognition) return;

    this.recognition.continuous = this.config.continuous;
    this.recognition.interimResults = this.config.interimResults;
    this.recognition.lang = this.config.lang;

    this.recognition.addEventListener('start', () => {
      console.log('Electron Speech: Recognition started');
      this.reconnectAttempts = 0;
      this.config.onStart();
    });

    this.recognition.addEventListener('result', (event: any) => {
      let finalTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        }
      }

      if (finalTranscript.trim()) {
        this.config.onResult(finalTranscript.trim());
      }
    });

    this.recognition.addEventListener('error', (event: any) => {
      console.error('Electron Speech: Error occurred', event.error);
      
      if (event.error === 'network' && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.handleNetworkError();
      } else {
        this.config.onError(this.getErrorMessage(event.error));
      }
    });

    this.recognition.addEventListener('end', () => {
      console.log('Electron Speech: Recognition ended');
      this.config.onEnd();
    });
  }

  private handleNetworkError(): void {
    this.reconnectAttempts++;
    console.log(`Electron Speech: Attempting reconnection (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      if (this.recognition) {
        try {
          this.recognition.start();
        } catch (error) {
          console.error('Electron Speech: Reconnection failed', error);
          this.config.onError('Failed to reconnect to speech service');
        }
      }
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  private getErrorMessage(error: string): string {
    const errorMessages = {
      'network': 'Network connection failed. Speech recognition may not work properly in Electron environment.',
      'not-allowed': 'Microphone access denied. Please allow microphone permissions.',
      'no-speech': 'No speech detected. Please try speaking again.',
      'aborted': 'Speech recognition was stopped.',
      'audio-capture': 'Audio capture failed. Please check your microphone.',
      'service-not-allowed': 'Speech recognition service not available in this environment.'
    };
    
    return errorMessages[error as keyof typeof errorMessages] || `Speech recognition error: ${error}`;
  }

  public async start(): Promise<boolean> {
    if (!this.recognition) {
      this.config.onError('Speech recognition not initialized');
      return false;
    }

    // Request microphone permission first
    const hasPermission = await this.requestMicrophoneAccess();
    if (!hasPermission) {
      this.config.onError('Microphone permission required');
      return false;
    }

    try {
      this.recognition.start();
      return true;
    } catch (error) {
      console.error('Electron Speech: Failed to start', error);
      this.config.onError('Failed to start speech recognition');
      return false;
    }
  }

  public stop(): void {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (error) {
        console.error('Electron Speech: Failed to stop', error);
      }
    }
  }

  public destroy(): void {
    this.stop();
    this.recognition = null;
  }
}
