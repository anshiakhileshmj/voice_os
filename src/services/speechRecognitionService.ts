
import { supabase } from '@/integrations/supabase/client';

export interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

export class ElectronSpeechRecognition extends EventTarget {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private isRecording = false;
  private intervalId: NodeJS.Timeout | null = null;

  async start() {
    try {
      // Request microphone permission
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        } 
      });

      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      this.audioChunks = [];
      this.isRecording = true;

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.processAudio();
      };

      // Start recording and process chunks every 3 seconds
      this.mediaRecorder.start();
      this.intervalId = setInterval(() => {
        if (this.mediaRecorder && this.isRecording) {
          this.mediaRecorder.stop();
          setTimeout(() => {
            if (this.isRecording) {
              this.mediaRecorder?.start();
            }
          }, 100);
        }
      }, 3000);

      console.log('Electron speech recognition started');
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      this.dispatchEvent(new CustomEvent('error', { detail: { error: 'microphone_access_denied' } }));
    }
  }

  stop() {
    this.isRecording = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    this.dispatchEvent(new CustomEvent('end'));
    console.log('Electron speech recognition stopped');
  }

  private async processAudio() {
    if (this.audioChunks.length === 0) return;

    try {
      const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
      this.audioChunks = [];

      // Convert to base64
      const base64Audio = await this.blobToBase64(audioBlob);
      
      // Send to our voice-to-text edge function
      const { data, error } = await supabase.functions.invoke('voice-to-text', {
        body: { audio: base64Audio }
      });

      if (error) throw error;

      if (data?.text && data.text.trim()) {
        const result: SpeechRecognitionResult = {
          transcript: data.text.trim(),
          confidence: 0.9, // AssemblyAI typically has high confidence
          isFinal: true
        };

        // Simulate the speech recognition result event
        const mockEvent = {
          resultIndex: 0,
          results: [{
            isFinal: true,
            length: 1,
            item: () => ({ transcript: result.transcript, confidence: result.confidence }),
            0: { transcript: result.transcript, confidence: result.confidence }
          }]
        };

        this.dispatchEvent(new CustomEvent('result', { detail: mockEvent }));
      }
    } catch (error) {
      console.error('Error processing audio:', error);
      this.dispatchEvent(new CustomEvent('error', { detail: { error: 'processing_failed' } }));
    }
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}

export const createSpeechRecognition = (): SpeechRecognition | ElectronSpeechRecognition => {
  // Check if we're in Electron
  const isElectron = navigator.userAgent.toLowerCase().indexOf('electron') > -1;
  
  if (isElectron || (!window.SpeechRecognition && !window.webkitSpeechRecognition)) {
    return new ElectronSpeechRecognition() as any;
  }

  // Use browser's native speech recognition
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  return new SpeechRecognition();
};
