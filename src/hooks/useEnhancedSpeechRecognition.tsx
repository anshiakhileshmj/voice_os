import { useState, useRef, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { audioProcessingService } from '@/services/audioProcessingService';
import { conversationContextService } from '@/services/conversationContextService';
import { streamingTTSService } from '@/services/streamingTTSService';
import { commandSequencer } from '@/services/commandSequencer';

interface EnhancedSpeechRecognitionHook {
  isRecording: boolean;
  isSupported: boolean;
  currentTranscript: string;
  partialTranscript: string;
  confidence: number;
  startContinuousRecognition: () => void;
  stopContinuousRecognition: () => void;
  onPartialResult: (callback: (transcript: string) => void) => void;
  onFinalResult: (callback: (transcript: string, confidence: number, turnId: string) => void) => void;
  onSpeechStart: (callback: () => void) => void;
  onSpeechEnd: (callback: () => void) => void;
  getConversationStats: () => any;
  resetConversation: () => void;
}

export const useEnhancedSpeechRecognition = (): EnhancedSpeechRecognitionHook => {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [partialTranscript, setPartialTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const partialCallbackRef = useRef<((transcript: string) => void) | null>(null);
  const finalCallbackRef = useRef<((transcript: string, confidence: number, turnId: string) => void) | null>(null);
  const speechStartCallbackRef = useRef<(() => void) | null>(null);
  const speechEndCallbackRef = useRef<(() => void) | null>(null);
  
  const isActiveRef = useRef(false);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastPartialTranscriptRef = useRef('');
  const speechStartedRef = useRef(false);
  const currentTurnIdRef = useRef<string>('');
  const isTTSPlayingRef = useRef(false);
  const restartAttemptsRef = useRef(0);
  const maxRestartAttemptsRef = useRef(3);
  
  const { toast } = useToast();

  const clearTimeouts = useCallback(() => {
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
  }, []);

  const isStopCommand = useCallback((text: string): boolean => {
    const stopKeywords = [
      'stop', 'pause', 'halt', 'quiet', 'silence', 'shut up', 'stop talking',
      'stop speaking', 'stop audio', 'mute', 'end', 'cancel'
    ];
    
    const lowerText = text.toLowerCase();
    return stopKeywords.some(keyword => lowerText.includes(keyword));
  }, []);

  // Monitor TTS state
  useEffect(() => {
    const checkTTSState = () => {
      isTTSPlayingRef.current = streamingTTSService.isCurrentlyPlaying();
    };
    
    const interval = setInterval(checkTTSState, 500);
    return () => clearInterval(interval);
  }, []);

  const handleSpeechStart = useCallback(() => {
    if (!speechStartedRef.current && !isTTSPlayingRef.current) {
      speechStartedRef.current = true;
      console.log('Enhanced STT: Speech started with audio processing');
      
      // Start audio processing
      audioProcessingService.startProcessing();
      
      if (speechStartCallbackRef.current) {
        speechStartCallbackRef.current();
      }
    }
  }, []);

  const handleSpeechEnd = useCallback(() => {
    if (speechStartedRef.current) {
      speechStartedRef.current = false;
      console.log('Enhanced STT: Speech ended');
      
      // Stop audio processing
      audioProcessingService.stopProcessing();
      
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

    recognition.addEventListener('start', () => {
      console.log('Enhanced STT: Recognition started with context awareness');
      setIsRecording(true);
      restartAttemptsRef.current = 0; // Reset restart attempts on successful start
    });

    recognition.addEventListener('result', async (event: any) => {
      // Skip processing if TTS is playing to avoid interference
      if (isTTSPlayingRef.current) {
        console.log('Skipping speech recognition while TTS is playing');
        return;
      }

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
          
          // Check for stop commands and stop TTS if detected
          if (isStopCommand(finalTranscript.trim())) {
            console.log('Stop command detected, stopping TTS:', finalTranscript.trim());
            streamingTTSService.stopPlayback();
          }
          
          // Handle speech end detection
          handleSpeechEnd();
          
          // Add command to sequencer for intelligent processing
          if (finalTranscript.trim()) {
            try {
              const sequencedCommands = await commandSequencer.addCommand(finalTranscript.trim());
              
              if (sequencedCommands.length > 0) {
                // Combine multiple commands into one intelligent request
                const combinedCommand = sequencedCommands.join('. ');
                
                // Finalize conversation turn with combined command
                const turnId = conversationContextService.finalizeTurn(combinedCommand, maxConfidence);
                currentTurnIdRef.current = turnId;
                
                // Send final result with turn ID
                if (finalCallbackRef.current) {
                  console.log('Enhanced STT: Final sequenced result:', combinedCommand);
                  finalCallbackRef.current(combinedCommand, maxConfidence, turnId);
                  setCurrentTranscript(combinedCommand);
                  setConfidence(maxConfidence);
                }
              }
            } catch (error) {
              console.error('Command sequencing error:', error);
              // Fallback to original behavior
              const turnId = conversationContextService.finalizeTurn(finalTranscript.trim(), maxConfidence);
              currentTurnIdRef.current = turnId;
              
              if (finalCallbackRef.current) {
                finalCallbackRef.current(finalTranscript.trim(), maxConfidence, turnId);
                setCurrentTranscript(finalTranscript.trim());
                setConfidence(maxConfidence);
              }
            }
          }
          
          // Clear partial transcript after final result
          setPartialTranscript('');
          lastPartialTranscriptRef.current = '';
        } else {
          interimTranscript += transcript;
          
          // Handle speech start detection (only if TTS is not playing)
          if (interimTranscript.trim() && !speechStartedRef.current && !isTTSPlayingRef.current) {
            handleSpeechStart();
          }
          
          // Check for stop commands in partial transcript and stop TTS immediately
          if (isStopCommand(interimTranscript.trim())) {
            console.log('Stop command detected in partial transcript, stopping TTS:', interimTranscript.trim());
            streamingTTSService.stopPlayback();
          }
          
          // Update conversation context with partial result (only if TTS is not playing)
          if (interimTranscript.trim() !== lastPartialTranscriptRef.current && !isTTSPlayingRef.current) {
            lastPartialTranscriptRef.current = interimTranscript.trim();
            setPartialTranscript(interimTranscript.trim());
            
            // Add to conversation context
            conversationContextService.addPartialTranscript(interimTranscript.trim(), currentConfidence);
            
            if (partialCallbackRef.current && interimTranscript.trim()) {
              console.log('Enhanced STT: Streaming partial result:', interimTranscript.trim());
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
          // Don't restart immediately on no-speech to avoid loops
          console.log('No speech detected, waiting before restart...');
          if (restartAttemptsRef.current < maxRestartAttemptsRef.current) {
            restartAttemptsRef.current++;
            if (isActiveRef.current) {
              restartTimeoutRef.current = setTimeout(() => {
                if (isActiveRef.current && recognitionRef.current && !isTTSPlayingRef.current) {
                  try {
                    recognitionRef.current.start();
                  } catch (error) {
                    console.error('Enhanced STT: No-speech restart failed:', error);
                  }
                }
              }, 2000); // Wait 2 seconds before restart
            }
          } else {
            console.log('Max restart attempts reached, stopping recognition');
            isActiveRef.current = false;
            setIsRecording(false);
          }
          break;
        case 'aborted':
          // Only restart if we're still supposed to be active and not due to TTS
          if (isActiveRef.current && !isTTSPlayingRef.current) {
            console.log('Recognition aborted, attempting restart...');
            restartTimeoutRef.current = setTimeout(() => {
              if (isActiveRef.current && recognitionRef.current) {
                try {
                  recognitionRef.current.start();
                } catch (error) {
                  console.error('Enhanced STT: Aborted restart failed:', error);
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
        case 'network':
          console.warn('Network error in speech recognition, continuing...');
          break;
        default:
          console.warn('Enhanced STT: Unhandled error:', event.error);
      }
    });

    recognition.addEventListener('end', () => {
      console.log('Enhanced STT: Recognition ended');
      
      // Only restart if still active and TTS is not playing
      if (isActiveRef.current && !isTTSPlayingRef.current) {
        restartTimeoutRef.current = setTimeout(() => {
          if (isActiveRef.current && !isTTSPlayingRef.current) {
            try {
              if (recognitionRef.current) {
                console.log('Enhanced STT: Restarting recognition for continuous listening');
                recognitionRef.current.start();
              }
            } catch (error) {
              console.error('Enhanced STT: Auto-restart failed:', error);
              // Try again after a longer delay
              if (isActiveRef.current) {
                restartTimeoutRef.current = setTimeout(() => {
                  if (isActiveRef.current && recognitionRef.current && !isTTSPlayingRef.current) {
                    try {
                      recognitionRef.current.start();
                    } catch (retryError) {
                      console.error('Enhanced STT: Retry restart failed:', retryError);
                    }
                  }
                }, 3000);
              }
            }
          }
        }, 500); // Short delay before restart
      } else {
        setIsRecording(false);
      }
    });

    return recognition;
  }, [toast, handleSpeechStart, handleSpeechEnd, isStopCommand]);

  const startContinuousRecognition = useCallback(async () => {
    if (isActiveRef.current) {
      console.log('Enhanced STT: Already active');
      return;
    }

    try {
      // Initialize audio processing service
      await audioProcessingService.initialize((audioData: Float32Array) => {
        // Audio chunks are being processed - could be used for additional analysis
        console.log('Audio chunk processed:', audioData.length, 'samples');
      });
    } catch (error) {
      console.error('Failed to initialize audio processing:', error);
      toast({
        title: "Audio Processing Failed",
        description: "Could not initialize enhanced audio processing.",
        variant: "destructive"
      });
    }

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
    restartAttemptsRef.current = 0;
    
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
        console.log('Enhanced STT: Started continuous recognition with intelligent sequencing');
        toast({
          title: "Enhanced Voice Recognition Started",
          description: "Always-on listening with intelligent command sequencing active."
        });
      } catch (error) {
        console.error('Enhanced STT: Start failed:', error);
        isActiveRef.current = false;
      }
    }
  }, [isSupported, toast, initializeRecognition]);

  const stopContinuousRecognition = useCallback(() => {
    console.log('Enhanced STT: Explicitly stopping continuous recognition');
    isActiveRef.current = false;
    speechStartedRef.current = false;
    restartAttemptsRef.current = 0;
    
    clearTimeouts();
    
    // Cleanup audio processing
    audioProcessingService.cleanup();
    
    // Force process any pending commands
    commandSequencer.forceProcess();
    
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
    
    toast({
      title: "Voice Recognition Stopped",
      description: "Continuous listening has ended."
    });
  }, [clearTimeouts, toast]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isActiveRef.current = false;
      clearTimeouts();
      audioProcessingService.cleanup();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (error) {
          console.error('Cleanup error:', error);
        }
      }
    };
  }, [clearTimeouts]);

  const onPartialResult = useCallback((callback: (transcript: string) => void) => {
    partialCallbackRef.current = callback;
  }, []);

  const onFinalResult = useCallback((callback: (transcript: string, confidence: number, turnId: string) => void) => {
    finalCallbackRef.current = callback;
  }, []);

  const onSpeechStart = useCallback((callback: () => void) => {
    speechStartCallbackRef.current = callback;
  }, []);

  const onSpeechEnd = useCallback((callback: () => void) => {
    speechEndCallbackRef.current = callback;
  }, []);

  const getConversationStats = useCallback(() => {
    return conversationContextService.getSessionStats();
  }, []);

  const resetConversation = useCallback(() => {
    conversationContextService.resetSession();
    setCurrentTranscript('');
    setPartialTranscript('');
    console.log('Conversation context reset');
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
    getConversationStats,
    resetConversation,
  };
};
