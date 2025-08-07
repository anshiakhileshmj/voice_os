
import { useState, useRef, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

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
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const resultCallbackRef = useRef<((transcript: string) => void) | null>(null);
  const { toast } = useToast();

  const isElectron = useCallback(() => {
    return !!(window as any).require || !!(window as any).electron || 
           navigator.userAgent.toLowerCase().includes('electron');
  }, []);

  const checkSpeechSupport = useCallback(() => {
    // Check if we're in Electron
    if (isElectron()) {
      // In Electron, check for speech recognition more carefully
      const hasWebkit = 'webkitSpeechRecognition' in window;
      const hasNative = 'SpeechRecognition' in window;
      
      if (!hasWebkit && !hasNative) {
        console.warn('Speech recognition not available in Electron environment');
        return false;
      }
      
      // Test if it actually works
      try {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const test = new SpeechRecognition();
        test.lang = 'en-US';
        return true;
      } catch (error) {
        console.error('Speech recognition test failed:', error);
        return false;
      }
    }
    
    // Regular browser check
    return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  }, [isElectron]);

  useEffect(() => {
    const supported = checkSpeechSupport();
    setIsSupported(supported);

    if (!supported) {
      toast({
        title: "Speech Recognition Unavailable",
        description: isElectron() 
          ? "Speech recognition is not available in this Electron build. Please use the web version for voice features."
          : "Speech recognition is not supported in this browser. Please use Chrome or Edge.",
        variant: "destructive"
      });
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    
    if (recognitionRef.current) {
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.addEventListener('start', () => {
        console.log('Speech recognition started');
        setIsRecording(true);
      });

      recognitionRef.current.addEventListener('result', (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        setCurrentTranscript(interimTranscript);

        if (finalTranscript && resultCallbackRef.current) {
          resultCallbackRef.current(finalTranscript.trim());
          setCurrentTranscript('');
        }
      });

      recognitionRef.current.addEventListener('error', (event: any) => {
        console.error('Speech recognition error:', event.error, event);
        
        let errorMessage = 'Speech recognition error occurred.';
        
        switch (event.error) {
          case 'network':
            errorMessage = 'Network error. Please check your internet connection.';
            break;
          case 'not-allowed':
            errorMessage = 'Microphone access denied. Please allow microphone permissions.';
            break;
          case 'no-speech':
            errorMessage = 'No speech detected. Please try speaking again.';
            break;
          case 'aborted':
            errorMessage = 'Speech recognition was aborted.';
            break;
          case 'audio-capture':
            errorMessage = 'Audio capture failed. Please check your microphone.';
            break;
          case 'service-not-allowed':
            errorMessage = 'Speech recognition service not allowed in this environment.';
            if (isElectron()) {
              errorMessage += ' This may be due to Electron security restrictions.';
            }
            break;
          default:
            errorMessage = `Speech recognition error: ${event.error}`;
        }

        toast({
          title: "Speech Recognition Error",
          description: errorMessage,
          variant: "destructive"
        });
        
        setIsRecording(false);
        setCurrentTranscript('');
      });

      recognitionRef.current.addEventListener('end', () => {
        console.log('Speech recognition ended');
        setIsRecording(false);
        setCurrentTranscript('');
      });
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [toast, isElectron, checkSpeechSupport]);

  const startRecording = useCallback(() => {
    if (!recognitionRef.current || !isSupported) {
      toast({
        title: "Cannot Start Recording",
        description: isElectron() 
          ? "Speech recognition is not available in this Electron environment."
          : "Speech recognition is not supported.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      recognitionRef.current.start();
      toast({
        title: "Recording Started",
        description: "Speak naturally. I'm listening and will respond in real-time.",
      });
    } catch (error) {
      console.error('Error starting recognition:', error);
      toast({
        title: "Error",
        description: "Failed to start recording. Please try again.",
        variant: "destructive"
      });
    }
  }, [isSupported, toast, isElectron]);

  const stopRecording = useCallback(() => {
    if (!recognitionRef.current) return;
    
    recognitionRef.current.stop();
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
