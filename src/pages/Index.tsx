import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Mic, MicOff, Settings, FileText, Volume2, VolumeX, Zap, ZapOff } from 'lucide-react';
import { actionRouter } from '@/services/actionRouter';
import { textToSpeechService } from '@/services/textToSpeechService';
import { ConversationMessage } from '@/services/llmService';
import { automateService } from '@/services/automateService';
import DocumentUpload from '@/components/DocumentUpload';
import AutomatePowerSwitch from '@/components/AutomatePowerSwitch';
import AnimatedCallButton from '@/components/AnimatedCallButton';

const Index = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [isListening, setIsListening] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isAutomateEnabled, setIsAutomateEnabled] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const checkAutomateService = async () => {
      try {
        const isConnected = await automateService.checkConnection();
        setIsAutomateEnabled(isConnected);
      } catch (error) {
        console.error('Error checking automation service:', error);
        setIsAutomateEnabled(false);
      }
    };

    checkAutomateService();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        setCurrentTranscript(finalTranscript || interimTranscript);

        if (finalTranscript) {
          clearTimeout(silenceTimerRef.current!);
          silenceTimerRef.current = setTimeout(() => {
            handleVoiceCommand(finalTranscript);
          }, 1000);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'no-speech') {
          setIsListening(false);
        }
      };

      recognitionRef.current.onend = () => {
        if (isCallActive) {
          try {
            recognitionRef.current.start();
          } catch (error) {
            console.error('Error restarting recognition:', error);
          }
        }
      };
    }
  }, [isCallActive]);

  const handleVoiceCommand = async (transcript: string) => {
    if (!transcript.trim() || isProcessing) return;

    setIsProcessing(true);
    setCurrentTranscript('');

    try {
      const result = await actionRouter.processUserInput(
        transcript, 
        conversationHistory, 
        isAutomateEnabled,
        isCallActive
      );

      let responseMessage = '';
      
      if (result.actionResult) {
        responseMessage = result.actionResult.message;
        
        if (result.actionResult.requiresTTS && isCallActive) {
          await speakResponse(responseMessage);
        }
      } else if (result.llmResponse && isCallActive) {
        responseMessage = result.llmResponse;
        await speakResponse(responseMessage);
      }

      if (responseMessage) {
        setConversationHistory(prev => [
          ...prev,
          { role: 'user', content: transcript },
          { role: 'assistant', content: responseMessage }
        ]);
      }

    } catch (error) {
      console.error('Error processing voice command:', error);
      const errorMessage = 'Sorry, I encountered an error processing your request.';
      
      if (isCallActive) {
        await speakResponse(errorMessage);
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const speakResponse = async (text: string) => {
    if (!isCallActive) return;
    
    try {
      setIsSpeaking(true);
      const audioBuffer = await textToSpeechService.convertTextToSpeech(text);
      await textToSpeechService.playAudio(audioBuffer);
    } catch (error) {
      console.error('Error speaking response:', error);
    } finally {
      setIsSpeaking(false);
    }
  };

  const toggleCall = async () => {
    if (isCallActive) {
      // Turn off call
      setIsCallActive(false);
      setIsListening(false);
      
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    } else {
      // Turn on call
      setIsCallActive(true);
      
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
          setIsListening(true);
        } catch (error) {
          console.error('Error starting recognition:', error);
        }
      }
    }
  };

  const handleAutomateToggle = async (enabled: boolean) => {
    setIsAutomateEnabled(enabled);
    
    if (enabled) {
      try {
        const isConnected = await automateService.checkConnection();
        if (isConnected) {
          const message = "Automation enabled";
          if (isCallActive) {
            await speakResponse(message);
          }
          toast({
            title: "Automation Status",
            description: message
          });
        } else {
          toast({
            title: "Automation Service",
            description: "Automation service is not running. Please start the service first.",
            variant: "destructive"
          });
          setIsAutomateEnabled(false);
        }
      } catch (error) {
        console.error('Error checking automation service:', error);
        toast({
          title: "Error",
          description: "Failed to connect to automation service.",
          variant: "destructive"
        });
        setIsAutomateEnabled(false);
      }
    } else {
      const message = "Automation disabled";
      if (isCallActive) {
        await speakResponse(message);
      }
      toast({
        title: "Automation Status",
        description: message
      });
    }
  };

  const handleDocumentProcessed = async (result: string, document?: any) => {
    if (isCallActive) {
      await speakResponse(result);
    }
    
    setConversationHistory(prev => [
      ...prev,
      { role: 'assistant', content: result }
    ]);
  };

  if (!user) {
    return <div>Please sign in to access the app.</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <img src="/o.png" alt="MJAK" className="w-10 h-10" />
              <h1 className="text-2xl font-bold text-gray-900">MJAK Automation</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="secondary" className="px-3 py-1">
                {user.email}
              </Badge>
              <Button variant="outline" onClick={signOut}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Control Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Voice Control Card */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mic className="w-5 h-5" />
                  Voice Control
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-center">
                  <AnimatedCallButton
                    isActive={isCallActive}
                    onClick={toggleCall}
                    disabled={isProcessing}
                  />
                </div>
                
                {/* Status Indicators */}
                <div className="flex justify-center space-x-4">
                  <div className="flex items-center space-x-2">
                    {isCallActive ? (
                      <Volume2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <VolumeX className="w-4 h-4 text-gray-400" />
                    )}
                    <span className="text-sm text-gray-600">
                      {isCallActive ? 'Call Active' : 'Call Inactive'}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {isListening ? (
                      <Mic className="w-4 h-4 text-blue-500 animate-pulse" />
                    ) : (
                      <MicOff className="w-4 h-4 text-gray-400" />
                    )}
                    <span className="text-sm text-gray-600">
                      {isListening ? 'Listening' : 'Not Listening'}
                    </span>
                  </div>
                </div>

                {/* Current Transcript */}
                {currentTranscript && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>You said:</strong> {currentTranscript}
                    </p>
                  </div>
                )}

                {/* Processing Indicator */}
                {isProcessing && (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                    <span className="text-sm text-gray-600">Processing...</span>
                  </div>
                )}

                {/* Speaking Indicator */}
                {isSpeaking && (
                  <div className="flex items-center justify-center space-x-2">
                    <Volume2 className="w-4 h-4 text-green-500 animate-pulse" />
                    <span className="text-sm text-green-600">Speaking...</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Automation Control */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Automation Control
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Device Automation</h3>
                    <p className="text-sm text-gray-600">
                      {isAutomateEnabled ? 'Automation is enabled' : 'Enable automation for device control'}
                    </p>
                  </div>
                  <AutomatePowerSwitch 
                    checked={isAutomateEnabled}
                    onChange={handleAutomateToggle}
                  />
                </div>
                
                {isAutomateEnabled && (
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Zap className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-green-800 font-medium">
                        Ready for automation commands
                      </span>
                    </div>
                    <p className="text-xs text-green-700 mt-1">
                      Say commands like "open Google", "create a document", or "send email"
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Document Upload */}
            <DocumentUpload onDocumentProcessed={handleDocumentProcessed} />
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Conversation History */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Conversation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {conversationHistory.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-8">
                      No conversation yet. Start by saying something!
                    </p>
                  ) : (
                    conversationHistory.map((message, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg text-sm ${
                          message.role === 'user'
                            ? 'bg-blue-50 text-blue-800 ml-4'
                            : 'bg-gray-50 text-gray-800 mr-4'
                        }`}
                      >
                        <strong>{message.role === 'user' ? 'You' : 'Assistant'}:</strong>{' '}
                        {message.content}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => {
                    if (isCallActive) {
                      handleVoiceCommand("Hello, how are you?");
                    }
                  }}
                  disabled={!isCallActive}
                >
                  Test Voice Chat
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => {
                    if (isCallActive && isAutomateEnabled) {
                      handleVoiceCommand("Open Google");
                    }
                  }}
                  disabled={!isCallActive || !isAutomateEnabled}
                >
                  Test Automation
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
