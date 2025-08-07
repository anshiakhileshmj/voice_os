
import { useState, useRef, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ElectronSpeechService, ElectronSpeechConfig } from '@/services/electronSpeechService';

interface SpeechRecognitionHook {
  isRecording: boolean;
  isSupported: boolean;
  currentTranscript: string;
  startRecording: () => void;
  stopRecording: () => void;
  onResult: (callback: (transcript: string) => void) => void;
}

export const useSpeechRecognition = (): SpeechRecognitionHook => {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const speechServiceRef = useRef<ElectronSpeechService | null>(null);
  const resultCallbackRef = useRef<((transcript: string) => void) | null>(null);
  const { toast } = useToast();

  const isElectron = useCallback(() => {
    return !!(window as any).require || !!(window as any).electron || 
           navigator.userAgent.toLowerCase().includes('electron');
  }, []);

  const checkSpeechSupport = useCallback(() => {
    const hasWebkit = 'webkitSpeechRecognition' in window;
    const hasNative = 'SpeechRecognition' in window;
    return hasWebkit || hasNative;
  }, []);

  const initializeSpeechService = useCallback(() => {
    if (!checkSpeechSupport()) {
      setIsSupported(false);
      return;
    }

    const config: ElectronSpeechConfig = {
      continuous: true,
      interimResults: true,
      lang: 'en-US',
      onResult: (transcript: string) => {
        console.log('Speech result received:', transcript);
        if (resultCallbackRef.current) {
          resultCallbackRef.current(transcript);
        }
        setCurrentTranscript('');
      },
      onError: (error: string) => {
        console.error('Speech service error:', error);
        
        // Show user-friendly error message
        if (error.includes('network') || error.includes('Network')) {
          toast({
            title: "Speech Recognition Issue",
            description: isElectron() 
              ? "Network connection failed. Speech recognition may have limited functionality in Electron. Consider using the web version for better performance."
              : "Network connection failed. Please check your internet connection.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Speech Recognition Error",
            description: error,
            variant: "destructive"
          });
        }
        
        setIsRecording(false);
        setCurrentTranscript('');
      },
      onStart: () => {
        console.log('Speech service started');
        setIsRecording(true);
      },
      onEnd: () => {
        console.log('Speech service ended');
        setIsRecording(false);
        setCurrentTranscript('');
      }
    };

    speechServiceRef.current = new ElectronSpeechService(config);
  }, [toast, isElectron, checkSpeechSupport]);

  useEffect(() => {
    const supported = checkSpeechSupport();
    setIsSupported(supported);

    if (!supported) {
      toast({
        title: "Speech Recognition Unavailable",
        description: isElectron() 
          ? "Speech recognition is not available in this Electron environment. Please use a supported browser."
          : "Speech recognition is not supported in this browser. Please use Chrome or Edge.",
        variant: "destructive"
      });
      return;
    }

    initializeSpeechService();

    return () => {
      if (speechServiceRef.current) {
        speechServiceRef.current.destroy();
      }
    };
  }, [toast, isElectron, initializeSpeechService]);

  const startRecording = useCallback(async () => {
    if (!speechServiceRef.current || !isSupported) {
      toast({
        title: "Cannot Start Recording",
        description: "Speech recognition service is not available.",
        variant: "destructive"
      });
      return;
    }
    
    const success = await speechServiceRef.current.start();
    if (success) {
      toast({
        title: "Recording Started",
        description: isElectron() 
          ? "Voice recording started. Note: Speech recognition may have limited functionality in Electron."
          : "Speak naturally. I'm listening and will respond in real-time.",
      });
    }
  }, [isSupported, toast, isElectron]);

  const stopRecording = useCallback(() => {
    if (speechServiceRef.current) {
      speechServiceRef.current.stop();
    }
    setIsRecording(false);
    setCurrentTranscript('');
  }, []);

  const onResult = useCallback((callback: (transcript: string) => void) => {
    resultCallbackRef.current = callback;
  }, []);

  return {
    isRecording,
    isSupported,
    currentTranscript,
    startRecording,
    stopRecording,
    onResult,
  };
};
