
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Mic, MicOff, Send, Volume2, VolumeX, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import FloatingActionButtons from '@/components/FloatingActionButtons';
import AnimatedCallButton from '@/components/AnimatedCallButton';
import { simplifiedActionRouter } from '@/services/simplifiedActionRouter';
import { spotifyService } from '@/services/spotifyService';

const Index = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSpotifyEnabled, setIsSpotifyEnabled] = useState(false);
  const [isSpotifyConnected, setIsSpotifyConnected] = useState(false);
  const [isAutomateEnabled, setIsAutomateEnabled] = useState(false);
  const [isAutomateConnected, setIsAutomateConnected] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const {
    isRecording,
    currentTranscript,
    startRecording,
    stopRecording,
    isSupported,
    onResult
  } = useSpeechRecognition();

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    checkSpotifyConnection();
    checkAutomateConnection();
  }, []);

  const checkSpotifyConnection = async () => {
    try {
      const connected = await spotifyService.isConnected();
      setIsSpotifyConnected(connected);
    } catch (error) {
      console.error('Error checking Spotify connection:', error);
    }
  };

  const checkAutomateConnection = () => {
    setIsAutomateConnected(true);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleStartCall = () => {
    setIsCallActive(true);
    if (isSupported) {
      handleVoiceInput();
    }
  };

  const handleSpotifyToggle = async (enabled: boolean) => {
    setIsSpotifyEnabled(enabled);
    
    if (enabled && !isSpotifyConnected) {
      try {
        await spotifyService.initiateAuth();
      } catch (error) {
        console.error('Spotify connection error:', error);
        setIsSpotifyEnabled(false);
        toast({
          title: "Spotify Connection Failed",
          description: "Unable to connect to Spotify. Please try again.",
          variant: "destructive"
        });
      }
    } else if (!enabled && isSpotifyConnected) {
      setIsSpotifyConnected(false);
      simplifiedActionRouter.processConversation("spotify disconnected", {
        onLLMChunk: () => {},
        onLLMComplete: () => {},
        onTTSStart: () => setIsSpeaking(true),
        onTTSComplete: () => setIsSpeaking(false),
        onError: (error) => console.error('TTS Error:', error)
      });
    }
  };

  const handleAutomateToggle = (enabled: boolean) => {
    const wasEnabled = isAutomateEnabled;
    setIsAutomateEnabled(enabled);
    simplifiedActionRouter.setAutomateEnabled(enabled);
    
    if (enabled && !wasEnabled) {
      simplifiedActionRouter.processConversation("automation enabled", {
        onLLMChunk: () => {},
        onLLMComplete: () => {},
        onTTSStart: () => setIsSpeaking(true),
        onTTSComplete: () => setIsSpeaking(false),
        onError: (error) => console.error('TTS Error:', error)
      });
    } else if (!enabled && wasEnabled) {
      simplifiedActionRouter.processConversation("automation disabled", {
        onLLMChunk: () => {},
        onLLMComplete: () => {},
        onTTSStart: () => setIsSpeaking(true),
        onTTSComplete: () => setIsSpeaking(false),
        onError: (error) => console.error('TTS Error:', error)
      });
    }
  };

  const handleDocumentUpload = (response: string, document?: any) => {
    const newMessage = { role: 'assistant' as const, content: response };
    setMessages(prev => [...prev, newMessage]);
    
    simplifiedActionRouter.processConversation(response, {
      onLLMChunk: () => {},
      onLLMComplete: () => {},
      onTTSStart: () => setIsSpeaking(true),
      onTTSComplete: () => setIsSpeaking(false),
      onError: (error) => console.error('TTS Error:', error)
    });
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user' as const, content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      let assistantResponse = '';
      
      await simplifiedActionRouter.processConversation(input, {
        onLLMChunk: (chunk: string) => {
          assistantResponse += chunk;
          setMessages(prev => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage && lastMessage.role === 'assistant') {
              lastMessage.content = assistantResponse;
            } else {
              newMessages.push({ role: 'assistant', content: assistantResponse });
            }
            return newMessages;
          });
        },
        onLLMComplete: (response: string) => {
          assistantResponse = response;
          setMessages(prev => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage && lastMessage.role === 'assistant') {
              lastMessage.content = response;
            } else {
              newMessages.push({ role: 'assistant', content: response });
            }
            return newMessages;
          });
        },
        onTTSStart: () => setIsSpeaking(true),
        onTTSComplete: () => setIsSpeaking(false),
        onError: (error: Error) => {
          console.error('Conversation error:', error);
          toast({
            title: "Error",
            description: "Something went wrong. Please try again.",
            variant: "destructive"
          });
        }
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceInput = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      setInput('');
      startRecording();
    }
  };

  useEffect(() => {
    onResult((transcript: string) => {
      setInput(transcript);
    });
  }, [onResult]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    
    if (code && state) {
      handleSpotifyCallback(code, state);
    }
  }, []);

  const handleSpotifyCallback = async (code: string, state: string) => {
    try {
      const success = await spotifyService.handleCallback(code, state);
      if (success) {
        setIsSpotifyConnected(true);
        setIsSpotifyEnabled(true);
        
        window.history.replaceState({}, document.title, window.location.pathname);
        
        simplifiedActionRouter.processConversation("spotify connected", {
          onLLMChunk: () => {},
          onLLMComplete: () => {},
          onTTSStart: () => setIsSpeaking(true),
          onTTSComplete: () => setIsSpeaking(false),
          onError: (error) => console.error('TTS Error:', error)
        });
        
        toast({
          title: "Spotify Connected",
          description: "Successfully connected to your Spotify account!"
        });
      }
    } catch (error) {
      console.error('Spotify callback error:', error);
      toast({
        title: "Connection Failed",
        description: "Failed to connect to Spotify. Please try again.",
        variant: "destructive"
      });
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent mb-2">
            MJAK
          </h1>
          <p className="text-gray-300">Your AI Voice Assistant</p>
        </div>

        {!isCallActive && (
          <div className="flex justify-center mb-8">
            <AnimatedCallButton
              label="Start Call"
              onClick={handleStartCall}
            />
          </div>
        )}

        {isCallActive && (
          <Card className="bg-white/10 border-white/20 backdrop-blur-lg mb-6">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Chat
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-96 overflow-y-auto bg-black/20 rounded-lg p-4 space-y-4">
                {messages.length === 0 && (
                  <div className="text-center text-gray-400 mt-20">
                    <div className="text-6xl mb-4">🎤</div>
                    <p>Start a conversation with MJAK</p>
                    <p className="text-sm mt-2">Speak naturally or type your message</p>
                  </div>
                )}
                
                {messages.map((message, index) => (
                  <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.role === 'user' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-700 text-white'
                    }`}>
                      {message.content}
                    </div>
                  </div>
                ))}
                
                {(isRecording && currentTranscript) && (
                  <div className="flex justify-end">
                    <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg bg-blue-600/50 text-white border-2 border-blue-400 animate-pulse">
                      {currentTranscript}...
                    </div>
                  </div>
                )}
                
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg bg-gray-700 text-white">
                      <div className="flex items-center space-x-2">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                        <span className="text-sm">MJAK is thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <Separator className="bg-white/20" />

              <form onSubmit={handleSubmit} className="flex gap-2">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your message or use voice input..."
                  className="flex-1 bg-black/20 border-white/20 text-white placeholder:text-gray-400 resize-none min-h-[60px]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                />
                
                <div className="flex flex-col gap-2">
                  {isSupported && (
                    <Button
                      type="button"
                      onClick={handleVoiceInput}
                      className={`p-3 ${isRecording ? 'bg-red-600 hover:bg-red-700 animate-pulse' : 'bg-green-600 hover:bg-green-700'}`}
                    >
                      {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </Button>
                  )}
                  
                  <Button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className="p-3 bg-blue-600 hover:bg-blue-700"
                  >
                    <Send className="w-5 h-5" />
                  </Button>
                </div>
              </form>

              <div className="flex items-center justify-between text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  {isSpeaking ? (
                    <>
                      <Volume2 className="w-4 h-4 animate-pulse" />
                      <span>MJAK is speaking...</span>
                    </>
                  ) : (
                    <>
                      <VolumeX className="w-4 h-4" />
                      <span>Ready</span>
                    </>
                  )}
                </div>
                
                {isRecording && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <span>Listening...</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <FloatingActionButtons
        isSpotifyEnabled={isSpotifyEnabled}
        isSpotifyConnected={isSpotifyConnected}
        isAutomateEnabled={isAutomateEnabled}
        isAutomateConnected={isAutomateConnected}
        onSpotifyToggle={handleSpotifyToggle}
        onAutomateToggle={handleAutomateToggle}
        onDocumentUpload={handleDocumentUpload}
      />
    </div>
  );
};

export default Index;
