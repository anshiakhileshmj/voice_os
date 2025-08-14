
import React, { useState, useEffect } from 'react';
import { useEnhancedSpeechRecognition } from '@/hooks/useEnhancedSpeechRecognition';
import { streamingLLMService } from '@/services/streamingLLMService';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const EnhancedVoiceInterface: React.FC = () => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [llmResponse, setLlmResponse] = useState('');
  const [streamingResponse, setStreamingResponse] = useState('');
  const [conversationHistory, setConversationHistory] = useState<string[]>([]);
  
  const { toast } = useToast();
  
  const {
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
  } = useEnhancedSpeechRecognition();

  // Handle partial results (real-time streaming to LLM could be added here)
  useEffect(() => {
    onPartialResult((transcript) => {
      console.log('Partial transcript:', transcript);
      // Could implement real-time streaming here in the future
    });
  }, [onPartialResult]);

  // Handle final results
  useEffect(() => {
    onFinalResult(async (transcript, conf) => {
      console.log('Final transcript:', transcript, 'Confidence:', conf);
      
      if (transcript.trim()) {
        // Add user message to history
        setConversationHistory(prev => [...prev, `User: ${transcript}`]);
        
        // Generate LLM response
        setIsStreaming(true);
        setStreamingResponse('');
        setLlmResponse('');
        
        try {
          await streamingLLMService.generateStreamingResponse(transcript, {
            onChunk: (chunk) => {
              setStreamingResponse(prev => prev + chunk);
            },
            onComplete: (fullResponse) => {
              setLlmResponse(fullResponse);
              setStreamingResponse('');
              setConversationHistory(prev => [...prev, `Assistant: ${fullResponse}`]);
              setIsStreaming(false);
            },
            onError: (error) => {
              console.error('LLM Error:', error);
              toast({
                title: "Response Generation Failed",
                description: error.message,
                variant: "destructive"
              });
              setIsStreaming(false);
              setStreamingResponse('');
            }
          });
        } catch (error) {
          console.error('Error generating response:', error);
          setIsStreaming(false);
          setStreamingResponse('');
        }
      }
    });
  }, [onFinalResult, toast]);

  // Handle speech events
  useEffect(() => {
    onSpeechStart(() => {
      console.log('Speech detected - user started speaking');
    });

    onSpeechEnd(() => {
      console.log('Speech ended - user stopped speaking');
    });
  }, [onSpeechStart, onSpeechEnd]);

  const handleToggleRecording = () => {
    if (isRecording) {
      stopContinuousRecognition();
    } else {
      startContinuousRecognition();
    }
  };

  if (!isSupported) {
    return (
      <Card className="p-6">
        <p className="text-center text-red-500">
          Speech recognition is not supported in your browser.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="text-center space-y-4">
          <h3 className="text-lg font-semibold">Enhanced Voice Interface</h3>
          
          <Button
            onClick={handleToggleRecording}
            variant={isRecording ? "destructive" : "default"}
            size="lg"
            className="w-full"
          >
            {isRecording ? (
              <>
                <MicOff className="mr-2 h-4 w-4" />
                Stop Continuous Listening
              </>
            ) : (
              <>
                <Mic className="mr-2 h-4 w-4" />
                Start Continuous Listening
              </>
            )}
          </Button>

          {isRecording && (
            <div className="space-y-2">
              <p className="text-sm text-green-600 flex items-center justify-center">
                <Volume2 className="mr-2 h-4 w-4" />
                Listening continuously...
              </p>
              
              {partialTranscript && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-blue-600">
                    <strong>Live:</strong> {partialTranscript}
                  </p>
                </div>
              )}
              
              {currentTranscript && (
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-sm text-green-600">
                    <strong>Final:</strong> {currentTranscript}
                    {confidence > 0 && (
                      <span className="ml-2 text-xs">
                        (Confidence: {Math.round(confidence * 100)}%)
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {(isStreaming || llmResponse || streamingResponse) && (
        <Card className="p-6">
          <h4 className="font-semibold mb-3">AI Response:</h4>
          {isStreaming && (
            <div className="bg-yellow-50 p-3 rounded-lg mb-3">
              <p className="text-sm text-yellow-700">
                <strong>Streaming:</strong> {streamingResponse}
                <span className="animate-pulse">▊</span>
              </p>
            </div>
          )}
          {llmResponse && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm">{llmResponse}</p>
            </div>
          )}
        </Card>
      )}

      {conversationHistory.length > 0 && (
        <Card className="p-6">
          <h4 className="font-semibold mb-3">Conversation History:</h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {conversationHistory.slice(-10).map((message, index) => (
              <div key={index} className="text-sm p-2 rounded-lg bg-gray-50">
                {message}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
