
import { useState, useRef, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface EnhancedSpeechRecognitionHook {
  isRecording: boolean;
  isSupported: boolean;
  currentTranscript: string;
  partialTranscript: string;
  confidence: number;
  startContinuousRecognition: () => void;
  stopContinuousRecognition: () => void;
  onPartialResult: (callback: (transcript: string) => void) => void;
  onFinalResult: (callback: (transcript: string, confidence: number) => void) => void;
  onSpeechStart: (callback: () => void) => void;
  onSpeechEnd: (callback: () => void) => void;
}

export const useEnhancedSpeechRecognition = (): EnhancedSpeechRecognitionHook => {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [partialTranscript, setPartialTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const partialCallbackRef = useRef<((transcript: string) => void) | null>(null);
  const finalCallbackRef = useRef<((transcript: string, confidence: number) => void) | null>(null);
  const speechStartCallbackRef = useRef<(() => void) | null>(null);
  const speechEndCallbackRef = useRef<(() => void) | null>(null);
  
  const isActiveRef = useRef(false);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastPartialTranscriptRef = useRef('');
  const speechStartedRef = useRef(false);
  
  const { toast } = useToast();

  const clearTimeouts = useCallback(() => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
  }, []);

  const handleSpeechStart = useCallback(() => {
    if (!speechStartedRef.current) {
      speechStartedRef.current = true;
      console.log('Enhanced STT: Speech started');
      if (speechStartCallbackRef.current) {
        speechStartCallbackRef.current();
      }
    }
  }, []);

  const handleSpeechEnd = useCallback(() => {
    if (speechStartedRef.current) {
      speechStartedRef.current = false;
      console.log('Enhanced STT: Speech ended');
      if (speechEndCallbackRef.current) {
        speechEndCallbackRef.current();
      }
    }
  }, []);

  const initializeRecognition = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setIsSupported(false);
      return null;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    // Use addEventListener instead of direct property assignment for better compatibility
    recognition.addEventListener('start', () => {
      console.log('Enhanced STT: Recognition started');
      setIsRecording(true);
    });

    recognition.addEventListener('result', (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';
      let maxConfidence = 0;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        const currentConfidence = result[0].confidence || 0;

        if (result.isFinal) {
          finalTranscript += transcript;
          maxConfidence = Math.max(maxConfidence, currentConfidence);
          
          // Handle speech end detection
          handleSpeechEnd();
          
          // Send final result
          if (finalTranscript.trim() && finalCallbackRef.current) {
            console.log('Enhanced STT: Final result:', finalTranscript.trim());
            finalCallbackRef.current(finalTranscript.trim(), maxConfidence);
            setCurrentTranscript(finalTranscript.trim());
            setConfidence(maxConfidence);
          }
          
          // Clear partial transcript after final result
          setPartialTranscript('');
          lastPartialTranscriptRef.current = '';
        } else {
          interimTranscript += transcript;
          
          // Handle speech start detection
          if (interimTranscript.trim() && !speechStartedRef.current) {
            handleSpeechStart();
          }
          
          // Send partial result if it's different from last one
          if (interimTranscript.trim() !== lastPartialTranscriptRef.current) {
            lastPartialTranscriptRef.current = interimTranscript.trim();
            setPartialTranscript(interimTranscript.trim());
            
            if (partialCallbackRef.current && interimTranscript.trim()) {
              console.log('Enhanced STT: Partial result:', interimTranscript.trim());
              partialCallbackRef.current(interimTranscript.trim());
            }
          }
        }
      }
    });

    recognition.addEventListener('error', (event: any) => {
      console.error('Enhanced STT: Recognition error:', event.error);
      
      // Handle different error types gracefully
      switch (event.error) {
        case 'no-speech':
          // Don't restart immediately for no-speech errors
          break;
        case 'aborted':
          // Only restart if we're still supposed to be active
          if (isActiveRef.current) {
            restartTimeoutRef.current = setTimeout(() => {
              if (isActiveRef.current && recognitionRef.current) {
                try {
                  recognitionRef.current.start();
                } catch (error) {
                  console.error('Enhanced STT: Restart failed:', error);
                }
              }
            }, 1000);
          }
          break;
        case 'not-allowed':
          toast({
            title: "Microphone Access Denied",
            description: "Please allow microphone access to use voice recognition.",
            variant: "destructive"
          });
          isActiveRef.current = false;
          setIsRecording(false);
          break;
        default:
          console.warn('Enhanced STT: Unhandled error:', event.error);
      }
    });

    recognition.addEventListener('end', () => {
      console.log('Enhanced STT: Recognition ended');
      setIsRecording(false);
      
      // Auto-restart if still active
      if (isActiveRef.current) {
        restartTimeoutRef.current = setTimeout(() => {
          if (isActiveRef.current) {
            try {
              if (recognitionRef.current) {
                recognitionRef.current.start();
              }
            } catch (error) {
              console.error('Enhanced STT: Auto-restart failed:', error);
            }
          }
        }, 500);
      }
    });

    return recognition;
  }, [toast, handleSpeechStart, handleSpeechEnd]);

  const startContinuousRecognition = useCallback(async () => {
    if (isActiveRef.current) {
      console.log('Enhanced STT: Already active');
      return;
    }

    // Request microphone permission
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      toast({
        title: "Microphone Permission Required",
        description: "Please allow microphone access to use voice recognition.",
        variant: "destructive"
      });
      return;
    }

    if (!isSupported) {
      toast({
        title: "Speech Recognition Not Supported",
        description: "Your browser doesn't support speech recognition.",
        variant: "destructive"
      });
      return;
    }

    isActiveRef.current = true;
    speechStartedRef.current = false;
    
    // Clean up existing recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error('Enhanced STT: Error stopping existing recognition:', error);
      }
    }

    // Initialize new recognition
    recognitionRef.current = initializeRecognition();
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        toast({
          title: "Enhanced Voice Recognition Started",
          description: "Continuous listening mode activated. Speak naturally."
        });
      } catch (error) {
        console.error('Enhanced STT: Start failed:', error);
        isActiveRef.current = false;
      }
    }
  }, [isSupported, toast, initializeRecognition]);

  const stopContinuousRecognition = useCallback(() => {
    console.log('Enhanced STT: Stopping continuous recognition');
    isActiveRef.current = false;
    speechStartedRef.current = false;
    
    clearTimeouts();
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error('Enhanced STT: Error stopping recognition:', error);
      }
    }
    
    setIsRecording(false);
    setPartialTranscript('');
    setCurrentTranscript('');
    lastPartialTranscriptRef.current = '';
  }, [clearTimeouts]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopContinuousRecognition();
    };
  }, [stopContinuousRecognition]);

  const onPartialResult = useCallback((callback: (transcript: string) => void) => {
    partialCallbackRef.current = callback;
  }, []);

  const onFinalResult = useCallback((callback: (transcript: string, confidence: number) => void) => {
    finalCallbackRef.current = callback;
  }, []);

  const onSpeechStart = useCallback((callback: () => void) => {
    speechStartCallbackRef.current = callback;
  }, []);

  const onSpeechEnd = useCallback((callback: () => void) => {
    speechEndCallbackRef.current = callback;
  }, []);

  return {
    isRecording,
    isSupported,
    currentTranscript,
    partialTranscript,
    confidence,
    startContinuousRecognition,
    stopContinuousRecognition,
    onPartialResult,
    onFinalResult,
    onSpeechStart,
    onSpeechEnd,
  };
};
