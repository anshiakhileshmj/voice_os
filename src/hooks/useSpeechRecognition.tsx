
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
  const retryCountRef = useRef(0);
  const maxRetries = 3;
  const { toast } = useToast();
  
  // Tracks whether the user intends for recognition to be running
  const wantsRecognitionRef = useRef(false);
  // Prevents rapid duplicate start() calls that can trigger 'aborted'
  const isStartingRef = useRef(false);
  // Marks that stop was requested by us (not an error)
  const stoppedManuallyRef = useRef(false);
  // Prevents infinite restart loops
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Track consecutive aborted errors
  const consecutiveAbortsRef = useRef(0);

  const requestMicrophonePermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.error('Microphone permission denied:', error);
      return false;
    }
  }, []);

  const webSpeechAvailable = useCallback(() => {
    const hasWebkit = 'webkitSpeechRecognition' in window;
    const hasNative = 'SpeechRecognition' in window;
    return hasWebkit || hasNative;
  }, []);

  const checkSpeechSupport = useCallback(() => {
    return webSpeechAvailable();
  }, [webSpeechAvailable]);

  const cleanupRecognition = useCallback(() => {
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.removeEventListener('start', () => {});
        recognitionRef.current.removeEventListener('result', () => {});
        recognitionRef.current.removeEventListener('error', () => {});
        recognitionRef.current.removeEventListener('end', () => {});
        recognitionRef.current.stop();
      } catch (error) {
        console.error('Error cleaning up recognition:', error);
      }
      recognitionRef.current = null;
    }
  }, []);

  const initializeSpeechRecognition = useCallback(() => {
    if (!webSpeechAvailable()) {
      setIsSupported(false);
      return;
    }

    // Clean up any existing recognition
    cleanupRecognition();

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    
    if (recognitionRef.current) {
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.addEventListener('start', () => {
        console.log('Speech recognition started');
        isStartingRef.current = false;
        setIsRecording(true);
        retryCountRef.current = 0;
        consecutiveAbortsRef.current = 0;
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
        isStartingRef.current = false;
        console.error('Speech recognition error:', event.error, event);
        
        let errorMessage = 'Speech recognition error occurred.';
        let shouldRetry = false;
        
        switch (event.error) {
          case 'network':
            errorMessage = 'Network error. Please check your internet connection.';
            shouldRetry = retryCountRef.current < maxRetries;
            break;
          case 'not-allowed':
            errorMessage = 'Microphone access denied. Please allow microphone permissions in your browser settings.';
            wantsRecognitionRef.current = false;
            break;
          case 'no-speech':
            errorMessage = 'No speech detected. Please try speaking again.';
            shouldRetry = retryCountRef.current < maxRetries;
            break;
          case 'aborted':
            consecutiveAbortsRef.current++;
            
            // If we have too many consecutive aborted errors, stop trying
            if (consecutiveAbortsRef.current >= 3) {
              console.warn('Too many consecutive aborted errors, stopping recognition');
              wantsRecognitionRef.current = false;
              setIsRecording(false);
              setCurrentTranscript('');
              toast({
                title: "Speech Recognition Error",
                description: "Speech recognition is having issues. Please try again.",
                variant: "destructive"
              });
              return;
            }
            
            // For aborted errors, only restart if user still wants recognition and we're not already starting
            if (wantsRecognitionRef.current && !isStartingRef.current) {
              shouldRetry = true;
            } else {
              setIsRecording(false);
              setCurrentTranscript('');
            }
            // Don't show toast for aborted errors as they're often benign
            return;
          case 'audio-capture':
            errorMessage = 'Audio capture failed. Please check your microphone connection.';
            break;
          case 'service-not-allowed':
            errorMessage = 'Speech recognition service not allowed. This may be due to browser or system restrictions.';
            break;
          default:
            errorMessage = `Speech recognition error: ${event.error}`;
            shouldRetry = retryCountRef.current < maxRetries;
        }

        // Auto-retry for certain errors
        if (shouldRetry) {
          retryCountRef.current++;
          
          // Clear any existing restart timeout
          if (restartTimeoutRef.current) {
            clearTimeout(restartTimeoutRef.current);
          }
          
          restartTimeoutRef.current = setTimeout(() => {
            if (recognitionRef.current && wantsRecognitionRef.current && !isStartingRef.current) {
              try {
                console.log(`Retrying speech recognition (attempt ${retryCountRef.current})`);
                isStartingRef.current = true;
                recognitionRef.current.start();
              } catch (error) {
                console.error('Retry failed:', error);
                setIsRecording(false);
                isStartingRef.current = false;
              }
            }
          }, 1000 + (retryCountRef.current * 500)); // Increasing delay for retries
          return;
        }

        // Show error toast for non-aborted errors
        if (event.error !== 'aborted') {
          toast({
            title: "Speech Recognition Error",
            description: errorMessage,
            variant: "destructive"
          });
        }
        
        wantsRecognitionRef.current = false;
        setIsRecording(false);
        setCurrentTranscript('');
      });

      recognitionRef.current.addEventListener('end', () => {
        console.log('Speech recognition ended');
        isStartingRef.current = false;
        
        // If we stopped manually, just reset state
        if (stoppedManuallyRef.current || !wantsRecognitionRef.current) {
          stoppedManuallyRef.current = false;
          setIsRecording(false);
          setCurrentTranscript('');
          cleanupRecognition();
          return;
        }

        // Auto-restart if the user still wants recognition and we haven't exceeded retries
        if (wantsRecognitionRef.current && retryCountRef.current < maxRetries && consecutiveAbortsRef.current < 3) {
          // Clear any existing restart timeout
          if (restartTimeoutRef.current) {
            clearTimeout(restartTimeoutRef.current);
          }
          
          restartTimeoutRef.current = setTimeout(() => {
            if (recognitionRef.current && wantsRecognitionRef.current && !isStartingRef.current) {
              try {
                isStartingRef.current = true;
                console.log('Auto-restarting speech recognition');
                recognitionRef.current.start();
              } catch (error) {
                console.error('Auto-restart failed:', error);
                setIsRecording(false);
                isStartingRef.current = false;
              }
            }
          }, 800);
        } else {
          setIsRecording(false);
          setCurrentTranscript('');
        }
      });
    }
  }, [toast, webSpeechAvailable, cleanupRecognition]);

  useEffect(() => {
    const supported = checkSpeechSupport();
    setIsSupported(supported);

    if (webSpeechAvailable()) {
      initializeSpeechRecognition();
    }

    return () => {
      cleanupRecognition();
    };
  }, [initializeSpeechRecognition, checkSpeechSupport, webSpeechAvailable, cleanupRecognition]);

  const startRecording = useCallback(async () => {
    // Prevent multiple simultaneous starts
    if (isStartingRef.current || isRecording) {
      console.log('Already starting or recording, ignoring start request');
      return;
    }

    // Request microphone permission first
    const hasPermission = await requestMicrophonePermission();
    if (!hasPermission) {
      toast({
        title: "Microphone Permission Required",
        description: "Please allow microphone access to use voice recognition.",
        variant: "destructive"
      });
      return;
    }

    if (!webSpeechAvailable()) {
      toast({ 
        title: 'Speech Not Supported', 
        description: 'This browser does not support Web Speech API.', 
        variant: 'destructive' 
      });
      return;
    }

    // Initialize fresh recognition instance
    initializeSpeechRecognition();
    
    try {
      wantsRecognitionRef.current = true;
      isStartingRef.current = true;
      retryCountRef.current = 0;
      consecutiveAbortsRef.current = 0;
      
      // Small delay to ensure clean state
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (recognitionRef.current) {
        recognitionRef.current.start();
        toast({ 
          title: "Recording Started", 
          description: "Speak naturally. I'm listening and will respond in real-time." 
        });
      }
    } catch (error) {
      console.error('Error starting recognition:', error);
      setIsRecording(false);
      isStartingRef.current = false;
      wantsRecognitionRef.current = false;
    }
  }, [isRecording, toast, requestMicrophonePermission, webSpeechAvailable, initializeSpeechRecognition]);

  const stopRecording = useCallback(() => {
    wantsRecognitionRef.current = false;
    stoppedManuallyRef.current = true;
    isStartingRef.current = false;
    
    // Clear any pending restart timeouts
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error('Error stopping recognition:', error);
      }
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
