
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Mic, MicOff, Download, Trash2, Volume2, VolumeX, LogOut, Bot } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { simplifiedActionRouter } from '@/services/simplifiedActionRouter';
import { spotifyService } from '@/services/spotifyService';
import { automateService } from '@/services/automateService';
import { streamingTTSService } from '@/services/streamingTTSService';
import { supabase } from '@/integrations/supabase/client';
import DocumentUpload from '@/components/DocumentUpload';
import FloatingActionButtons from '@/components/FloatingActionButtons';
import spotifyIcon from '@/assets/spotify-icon.svg';
import AutomatePowerSwitch from '../components/AutomatePowerSwitch';
import AnimatedCallButton from '../components/AnimatedCallButton';

interface TranscriptEntry {
  id: string;
  text: string;
  timestamp: Date;
  type: 'user' | 'assistant';
}

const Index = () => {
  const { user, loading, signOut } = useAuth();
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [currentResponse, setCurrentResponse] = useState('');
  const [isProcessingLLM, setIsProcessingLLM] = useState(false);
  const [isPlayingTTS, setIsPlayingTTS] = useState(false);
  const [isSpotifyConnected, setIsSpotifyConnected] = useState(false);
  const [isSpotifyEnabled, setIsSpotifyEnabled] = useState(false);
  const [isAutomateEnabled, setIsAutomateEnabled] = useState(false);
  const [isAutomateConnected, setIsAutomateConnected] = useState(false);
  const [userName, setUserName] = useState('');
  const [lastUploadedDocument, setLastUploadedDocument] = useState<any>(null);
  const { toast } = useToast();

  // Fixed voice to English US Male
  const selectedVoice = 'english_us_male';

  // Use the new speech recognition hook
  const speechRecognition = useSpeechRecognition();

  useEffect(() => {
    // Set up speech recognition result handler
    speechRecognition.onResult((finalTranscript: string) => {
      const newEntry: TranscriptEntry = {
        id: Date.now().toString(),
        text: finalTranscript,
        timestamp: new Date(),
        type: 'user'
      };
      
      setTranscript(prev => [...prev, newEntry]);
      
      // Process through streamlined conversation system
      handleStreamingConversation(finalTranscript);
    });
  }, [speechRecognition]);

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = '/';
    } else if (user) {
      const getUserProfile = async () => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', user.id)
          .single();
        
        if (profile?.name) {
          setUserName(profile.name);
        } else {
          setUserName(user.email?.split('@')[0] || 'there');
        }
      };
      getUserProfile();
    }
  }, [user, loading]);

  useEffect(() => {
    const checkAutomateConnection = async () => {
      if (isAutomateEnabled) {
        const connected = await automateService.checkConnection();
        setIsAutomateConnected(connected);
      }
    };

    checkAutomateConnection();
    const interval = isAutomateEnabled ? setInterval(checkAutomateConnection, 30000) : null;

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAutomateEnabled]);

  useEffect(() => {
    const checkSpotifyConnection = async () => {
      if (user) {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        
        if (code && state) {
          try {
            const success = await spotifyService.handleCallback(code, state);
            if (success) {
              setIsSpotifyConnected(true);
              toast({
                title: "Spotify Connected!",
                description: "You can now control music with voice commands.",
              });
              window.history.replaceState({}, document.title, window.location.pathname);
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
        } else {
          const connected = await spotifyService.isConnected();
          setIsSpotifyConnected(connected);
        }
      }
    };
    checkSpotifyConnection();
  }, [user, toast]);

  const handleStreamingConversation = async (userInput: string) => {
    if (!userInput.trim()) return;

    setIsProcessingLLM(true);
    setCurrentResponse('');
    
    // Set automation state
    simplifiedActionRouter.setAutomateEnabled(isAutomateEnabled);

    try {
      await simplifiedActionRouter.processConversation(userInput, {
        onLLMChunk: (chunk: string) => {
          setCurrentResponse(prev => prev + chunk);
        },
        onLLMComplete: (response: string) => {
          setIsProcessingLLM(false);
          
          // Add assistant response to transcript
          const assistantEntry: TranscriptEntry = {
            id: (Date.now() + 1).toString(),
            text: response,
            timestamp: new Date(),
            type: 'assistant'
          };
          setTranscript(prev => [...prev, assistantEntry]);
          setCurrentResponse('');
        },
        onTTSStart: () => {
          setIsPlayingTTS(true);
        },
        onTTSComplete: () => {
          setIsPlayingTTS(false);
        },
        onError: (error: Error) => {
          console.error('Conversation error:', error);
          setIsProcessingLLM(false);
          setIsPlayingTTS(false);
          toast({
            title: "Conversation Error",
            description: error.message,
            variant: "destructive"
          });
        }
      });

    } catch (error) {
      console.error('Streaming conversation error:', error);
      setIsProcessingLLM(false);
      setIsPlayingTTS(false);
      toast({
        title: "AI Error",
        description: error instanceof Error ? error.message : "Failed to process your request.",
        variant: "destructive"
      });
    }
  };

  const startRecording = () => {
    speechRecognition.startRecording();
  };

  const stopRecording = () => {
    speechRecognition.stopRecording();
    simplifiedActionRouter.stopCurrentConversation();
    setIsProcessingLLM(false);
    setIsPlayingTTS(false);
    toast({
      title: "Recording Stopped",
      description: "Conversation ended.",
    });
  };

  const clearTranscript = () => {
    setTranscript([]);
    setCurrentResponse('');
    simplifiedActionRouter.clearConversationHistory();
    toast({
      title: "Conversation Cleared",
      description: "All conversation data has been removed.",
    });
  };

  const downloadTranscript = () => {
    if (transcript.length === 0) {
      toast({
        title: "No Content",
        description: "No conversation available to download.",
        variant: "destructive"
      });
      return;
    }

    const content = transcript
      .map(entry => `[${entry.timestamp.toLocaleTimeString()}] ${entry.type === 'user' ? 'You' : 'MJAK'}: ${entry.text}`)
      .join('\n\n');
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Download Complete",
      description: "Conversation has been downloaded successfully.",
    });
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const handleSpotifyToggle = async (enabled: boolean) => {
    setIsSpotifyEnabled(enabled);
    
    if (enabled && !isSpotifyConnected) {
      try {
        await spotifyService.initiateAuth();
        toast({
          title: "Connecting to Spotify",
          description: "Redirecting you to Spotify to connect your account...",
        });
      } catch (error) {
        console.error('Spotify connection error:', error);
        setIsSpotifyEnabled(false);
        toast({
          title: "Connection Failed",
          description: "Failed to connect to Spotify. Please try again.",
          variant: "destructive"
        });
      }
    } else if (!enabled) {
      toast({
        title: "Spotify Disabled",
        description: "Spotify integration has been disabled.",
      });
    }
  };

  const handleAutomateToggle = async (enabled: boolean) => {
    setIsAutomateEnabled(enabled);
    
    // Play TTS announcement
    if (enabled) {
      await streamingTTSService.convertStreamingTextToSpeech("Automation enabled", {
        voiceId: selectedVoice,
        onError: (error) => console.error('TTS error:', error)
      });
      
      const connected = await automateService.checkConnection();
      setIsAutomateConnected(connected);
    } else {
      await streamingTTSService.convertStreamingTextToSpeech("Automation disabled", {
        voiceId: selectedVoice,
        onError: (error) => console.error('TTS error:', error)
      });
      
      setIsAutomateConnected(false);
    }
  };

  const handleDocumentUpload = async (response: string, document?: any) => {
    if (document) {
      setLastUploadedDocument(document);
    }
    
    const promptMessage = "PDF uploaded successfully! What would you like me to do with this PDF?";
    
    // Handle through streaming conversation system
    await handleStreamingConversation(promptMessage);
    
    if (!speechRecognition.isRecording) {
      setTimeout(() => {
        startRecording();
      }, 2000);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!speechRecognition.isSupported) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-red-600">Speech Recognition Unavailable</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">
              Speech recognition is not available in this environment. This may be due to browser limitations or Electron security restrictions. Please use a compatible browser or the web version for voice features.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'rgb(33,33,33)' }}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Animated Call Button Section */}
        <div className="flex justify-center my-8">
          <AnimatedCallButton
            label={speechRecognition.isRecording ? 'End Call' : 'Start Call'}
            onClick={speechRecognition.isRecording ? stopRecording : startRecording}
          />
        </div>

        {/* Live Transcript & Response */}
        {(speechRecognition.currentTranscript || currentResponse || speechRecognition.isRecording) && (
          <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                Live Conversation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {speechRecognition.currentTranscript && (
                <div className="text-lg text-gray-700 leading-relaxed">
                  <span className="text-xs text-muted-foreground">You:</span>
                  <p>{speechRecognition.currentTranscript}</p>
                </div>
              )}
              {currentResponse && (
                <div className="text-lg text-blue-800 leading-relaxed">
                  <span className="text-xs text-blue-600">MJAK:</span>
                  <p>{currentResponse}</p>
                </div>
              )}
              {speechRecognition.isRecording && !speechRecognition.currentTranscript && !currentResponse && (
                <p className="text-lg text-gray-700 min-h-[3rem] leading-relaxed">Listening...</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Conversation History */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Conversation History</span>
              {transcript.length > 0 && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                    {transcript.length} messages
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={clearTranscript}
                    className="h-6 px-2 text-xs"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={downloadTranscript}
                    className="h-6 px-2 text-xs"
                  >
                    <Download className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {transcript.length === 0 ? (
              <div className="text-center py-12">
                <Mic className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                <p className="text-muted-foreground text-lg">No conversations yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Click "Start Call" to begin a natural conversation with MJAK
                </p>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {transcript.map((entry, index) => (
                  <div
                    key={entry.id}
                    className={`p-4 rounded-lg border transition-shadow duration-200 ${
                      entry.type === 'user' 
                        ? 'bg-gradient-to-r from-gray-50 to-blue-50 border-gray-200' 
                        : 'bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {entry.type === 'user' ? 'You' : 'MJAK'}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatTimestamp(entry.timestamp)}
                      </div>
                    </div>
                    <p className="text-gray-800 leading-relaxed">{entry.text}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Document Upload */}
        <DocumentUpload onDocumentProcessed={handleDocumentUpload} />

        {/* Floating Action Buttons */}
        <FloatingActionButtons 
          isSpotifyEnabled={isSpotifyEnabled}
          isSpotifyConnected={isSpotifyConnected}
          isAutomateEnabled={isAutomateEnabled}
          isAutomateConnected={isAutomateConnected}
          onSpotifyToggle={handleSpotifyToggle}
          onAutomateToggle={handleAutomateToggle}
          onDocumentUpload={handleDocumentUpload}
        />

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>Built with Web Speech API & ElevenLabs • Works best in Chrome and Edge browsers</p>
        </div>
      </div>
    </div>
  );
};

export default Index;
