
import React, { useState, useEffect } from 'react';
import { useEnhancedSpeechRecognition } from '@/hooks/useEnhancedSpeechRecognition';
import { enhancedStreamingLLMService } from '@/services/enhancedStreamingLLMService';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mic, MicOff, Volume2, RotateCcw, BarChart3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const EnhancedVoiceInterface: React.FC = () => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [llmResponse, setLlmResponse] = useState('');
  const [streamingResponse, setStreamingResponse] = useState('');
  const [conversationHistory, setConversationHistory] = useState<string[]>([]);
  const [contextUpdates, setContextUpdates] = useState<string[]>([]);
  const [conversationStats, setConversationStats] = useState<any>(null);
  
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
    getConversationStats,
    resetConversation,
  } = useEnhancedSpeechRecognition();

  // Handle partial results for real-time streaming
  useEffect(() => {
    onPartialResult((transcript) => {
      console.log('Real-time partial transcript:', transcript);
      // Could implement real-time streaming to LLM here for immediate responses
    });
  }, [onPartialResult]);

  // Handle final results with context awareness
  useEffect(() => {
    onFinalResult(async (transcript, conf, turnId) => {
      console.log('Context-aware final transcript:', transcript, 'Confidence:', conf, 'Turn ID:', turnId);
      
      if (transcript.trim()) {
        // Add user message to history
        setConversationHistory(prev => [...prev, `User: ${transcript}`]);
        
        // Generate context-aware LLM response
        setIsStreaming(true);
        setStreamingResponse('');
        setLlmResponse('');
        setContextUpdates([]);
        
        try {
          await enhancedStreamingLLMService.generateContextAwareResponse(transcript, {
            onChunk: (chunk) => {
              setStreamingResponse(prev => prev + chunk);
            },
            onComplete: (fullResponse, completedTurnId) => {
              setLlmResponse(fullResponse);
              setStreamingResponse('');
              setConversationHistory(prev => [...prev, `Assistant: ${fullResponse}`]);
              setIsStreaming(false);
              
              // Update conversation stats
              setConversationStats(getConversationStats());
            },
            onError: (error) => {
              console.error('Enhanced LLM Error:', error);
              toast({
                title: "Context-Aware Response Failed",
                description: error.message,
                variant: "destructive"
              });
              setIsStreaming(false);
              setStreamingResponse('');
            },
            onContextUpdate: (contextChunk) => {
              setContextUpdates(prev => [...prev, contextChunk]);
            }
          }, turnId);
        } catch (error) {
          console.error('Error generating context-aware response:', error);
          setIsStreaming(false);
          setStreamingResponse('');
        }
      }
    });
  }, [onFinalResult, toast, getConversationStats]);

  // Handle speech events
  useEffect(() => {
    onSpeechStart(() => {
      console.log('Enhanced speech detection - user started speaking');
    });

    onSpeechEnd(() => {
      console.log('Enhanced speech detection - user stopped speaking');
    });
  }, [onSpeechStart, onSpeechEnd]);

  const handleToggleRecording = () => {
    if (isRecording) {
      stopContinuousRecognition();
    } else {
      startContinuousRecognition();
    }
  };

  const handleResetConversation = () => {
    resetConversation();
    enhancedStreamingLLMService.resetConversation();
    setConversationHistory([]);
    setLlmResponse('');
    setStreamingResponse('');
    setContextUpdates([]);
    setConversationStats(null);
    toast({
      title: "Conversation Reset",
      description: "Context and history have been cleared."
    });
  };

  const handleShowStats = () => {
    const stats = getConversationStats();
    setConversationStats(stats);
    toast({
      title: "Conversation Statistics",
      description: `${stats.turnCount} turns, ${Math.round(stats.averageConfidence * 100)}% avg confidence`
    });
  };

  if (!isSupported) {
    return (
      <Card className="p-6">
        <p className="text-center text-red-500">
          Enhanced speech recognition is not supported in your browser.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="text-center space-y-4">
          <h3 className="text-lg font-semibold">Enhanced Context-Aware Voice Interface</h3>
          
          <div className="flex gap-2 justify-center">
            <Button
              onClick={handleToggleRecording}
              variant={isRecording ? "destructive" : "default"}
              size="lg"
              className="flex-1"
            >
              {isRecording ? (
                <>
                  <MicOff className="mr-2 h-4 w-4" />
                  Stop Enhanced Listening
                </>
              ) : (
                <>
                  <Mic className="mr-2 h-4 w-4" />
                  Start Enhanced Listening
                </>
              )}
            </Button>
            
            <Button
              onClick={handleResetConversation}
              variant="outline"
              size="lg"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            
            <Button
              onClick={handleShowStats}
              variant="outline"
              size="lg"
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
          </div>

          {isRecording && (
            <div className="space-y-2">
              <p className="text-sm text-green-600 flex items-center justify-center">
                <Volume2 className="mr-2 h-4 w-4" />
                Enhanced listening with audio processing and context awareness...
              </p>
              
              {partialTranscript && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-blue-600">
                    <strong>Streaming:</strong> {partialTranscript}
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
          <h4 className="font-semibold mb-3">Context-Aware AI Response:</h4>
          {isStreaming && (
            <div className="bg-yellow-50 p-3 rounded-lg mb-3">
              <p className="text-sm text-yellow-700">
                <strong>Streaming Response:</strong> {streamingResponse}
                <span className="animate-pulse">▊</span>
              </p>
              {contextUpdates.length > 0 && (
                <p className="text-xs text-yellow-600 mt-1">
                  Context chunks received: {contextUpdates.length}
                </p>
              )}
            </div>
          )}
          {llmResponse && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm">{llmResponse}</p>
            </div>
          )}
        </Card>
      )}

      {conversationStats && (
        <Card className="p-6">
          <h4 className="font-semibold mb-3">Session Statistics:</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Session ID:</span> {conversationStats.sessionId.split('_')[1]}
            </div>
            <div>
              <span className="font-medium">Turns:</span> {conversationStats.turnCount}
            </div>
            <div>
              <span className="font-medium">Avg Confidence:</span> {Math.round(conversationStats.averageConfidence * 100)}%
            </div>
            <div>
              <span className="font-medium">Duration:</span> {Math.round(conversationStats.sessionDuration / 1000)}s
            </div>
          </div>
        </Card>
      )}

      {conversationHistory.length > 0 && (
        <Card className="p-6">
          <h4 className="font-semibold mb-3">Context-Aware Conversation History:</h4>
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
