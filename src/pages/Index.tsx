import React, { useState, useEffect } from 'react';
import { AnimatedCallButton } from '@/components/AnimatedCallButton';
import { FloatingActionButtons } from '@/components/FloatingActionButtons';
import { simplifiedActionRouter } from '@/services/simplifiedActionRouter';
import { spotifyService } from '@/services/spotifyService';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const [isListening, setIsListening] = useState(false);
  const [isConversationActive, setIsConversationActive] = useState(false);
  const [conversation, setConversation] = useState<Array<{role: 'user' | 'assistant', content: string}>>([]);
  const [currentResponse, setCurrentResponse] = useState('');
  const [isSpotifyEnabled, setIsSpotifyEnabled] = useState(false);
  const [isSpotifyConnected, setIsSpotifyConnected] = useState(false);
  const [isAutomateEnabled, setIsAutomateEnabled] = useState(false);
  const [isAutomateConnected, setIsAutomateConnected] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  // Check for Spotify callback on component mount
  useEffect(() => {
    const handleSpotifyCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      
      if (code && state) {
        try {
          const success = await spotifyService.handleCallback(code, state);
          if (success) {
            setIsSpotifyConnected(true);
            setIsSpotifyEnabled(true);
            toast({
              title: "Spotify Connected",
              description: "Your Spotify account has been successfully connected!",
            });
          } else {
            toast({
              title: "Connection Failed",
              description: "Failed to connect to Spotify. Please try again.",
              variant: "destructive"
            });
          }
        } catch (error) {
          console.error('Spotify callback error:', error);
          toast({
            title: "Connection Error",
            description: "An error occurred while connecting to Spotify.",
            variant: "destructive"
          });
        }
        
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    };

    handleSpotifyCallback();
  }, [toast]);

  // Check Spotify connection status
  useEffect(() => {
    const checkSpotifyConnection = async () => {
      try {
        const connected = await spotifyService.isConnected();
        setIsSpotifyConnected(connected);
      } catch (error) {
        console.error('Error checking Spotify connection:', error);
      }
    };

    checkSpotifyConnection();
  }, []);

  const handleStartConversation = () => {
    setIsListening(true);
    setIsConversationActive(true);
    setCurrentResponse('');

    window.electronAPI.startListening()
      .then((text: string) => {
        if (text) {
          const newMessage = { role: 'user' as const, content: text };
          setConversation(prev => [...prev, newMessage]);

          simplifiedActionRouter.processConversation(text, {
            onLLMChunk: (chunk: string) => {
              setCurrentResponse(prev => prev + chunk);
            },
            onLLMComplete: (response: string) => {
              const assistantMessage = { role: 'assistant' as const, content: response };
              setConversation(prev => [...prev, assistantMessage]);
              setIsConversationActive(false);
              setIsListening(false);
            },
            onTTSStart: () => {
              console.log('TTS started');
            },
            onTTSComplete: () => {
              console.log('TTS completed');
            },
            onError: (error: Error) => {
              console.error('Error during conversation:', error);
              toast({
                title: "An error occurred",
                description: error.message,
                variant: "destructive",
              });
              setIsListening(false);
              setIsConversationActive(false);
            }
          });
        } else {
          setIsListening(false);
          setIsConversationActive(false);
        }
      })
      .catch((error: Error) => {
        console.error('Error starting conversation:', error);
        toast({
          title: "Voice Recognition Error",
          description: "Failed to start voice recognition. Please check your microphone and permissions.",
          variant: "destructive",
        });
        setIsListening(false);
        setIsConversationActive(false);
      });
  };

  const handleStopConversation = () => {
    simplifiedActionRouter.stopCurrentConversation();
    setIsListening(false);
    setIsConversationActive(false);
    setCurrentResponse('');
  };

  const handleClearHistory = () => {
    simplifiedActionRouter.clearConversationHistory();
    setConversation([]);
    setCurrentResponse('');
  };

  const handleSpotifyToggle = (enabled: boolean) => {
    setIsSpotifyEnabled(enabled);
    simplifiedActionRouter.setAutomateEnabled(enabled);
  };

  const handleAutomateToggle = (enabled: boolean) => {
    setIsAutomateEnabled(enabled);
    simplifiedActionRouter.setAutomateEnabled(enabled);
  };

  const handleDocumentUpload = (response: string, document?: any) => {
    const newMessage = { role: 'assistant' as const, content: response };
    setConversation(prev => [...prev, newMessage]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-800 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('/placeholder.svg')] opacity-5"></div>
      
      <div className="relative z-10 flex flex-col items-center justify-center space-y-8 max-w-4xl mx-auto text-center">
        <div className="space-y-4">
          <h1 className="text-6xl md:text-8xl font-bold text-white mb-4 tracking-tight">
            Voice<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">OS</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed">
            Your AI-powered voice assistant that understands, learns, and adapts to your needs
          </p>
        </div>

        <div className="flex flex-col items-center space-y-6">
          <AnimatedCallButton 
            isListening={isListening}
            onStart={handleStartConversation}
            onStop={handleStopConversation}
          />
          
          <div className="flex gap-4">
            <Button 
              onClick={handleClearHistory}
              variant="outline"
              className="bg-black/20 border-white/20 text-white hover:bg-white/10"
            >
              Clear History
            </Button>
            
            <Button 
              onClick={() => window.location.href = '/pricing'}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 24" className="w-5 h-5 mr-2 fill-current">
                <path d="m18 0 8 12 10-8-4 20H4L0 4l10 8 8-12z" />
              </svg>
              Pricing
            </Button>
          </div>
        </div>

        {conversation.length > 0 && (
          <div className="w-full max-w-2xl space-y-4 max-h-96 overflow-y-auto bg-black/20 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            {conversation.map((message, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-blue-600/20 text-blue-100 ml-8'
                    : 'bg-purple-600/20 text-purple-100 mr-8'
                }`}
              >
                <div className="font-semibold text-sm mb-1 opacity-75">
                  {message.role === 'user' ? 'You' : 'VoiceOS'}
                </div>
                <div>{message.content}</div>
              </div>
            ))}
            
            {currentResponse && (
              <div className="p-4 rounded-lg bg-purple-600/20 text-purple-100 mr-8">
                <div className="font-semibold text-sm mb-1 opacity-75">VoiceOS</div>
                <div>{currentResponse}</div>
              </div>
            )}
          </div>
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
