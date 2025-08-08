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
import { supabase } from '@/integrations/supabase/client';
import DocumentUpload from '@/components/DocumentUpload';
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
  const [fabOpen, setFabOpen] = useState(false);
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
        if (!connected) {
          toast({
            title: "Automation Service Offline",
            description: "Please start the MJAK automation service to enable automation features.",
            variant: "destructive"
          });
        }
      }
    };

    checkAutomateConnection();
    const interval = isAutomateEnabled ? setInterval(checkAutomateConnection, 30000) : null;

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAutomateEnabled, toast]);

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
    
    if (enabled) {
      const connected = await automateService.checkConnection();
      setIsAutomateConnected(connected);
      
      if (connected) {
        toast({
          title: "Automation Enabled",
          description: "You can now automate your computer with voice commands like 'open Google' or 'take a screenshot'.",
        });
      } else {
        toast({
          title: "Automation Service Required",
          description: "Please start the MJAK automation service to enable automation features.",
          variant: "destructive"
        });
      }
    } else {
      setIsAutomateConnected(false);
      toast({
        title: "Automation Disabled",
        description: "Computer automation has been disabled.",
      });
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
        {/* Settings Card */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-sm">Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Processing Status */}
            {(isPlayingTTS || isProcessingLLM) && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Bot className="w-4 h-4 animate-pulse" />
                {isProcessingLLM ? 'Thinking...' : 'Speaking...'}
              </div>
            )}

            {/* Automation Status */}
            {isAutomateEnabled && (
              <div>
                <label className="text-sm font-medium mb-2 block">Automation Status</label>
                <div className="flex items-center gap-2">
                  {isAutomateConnected ? (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-sm text-blue-600">Connected</span>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                        Ready for automation commands
                      </Badge>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span className="text-sm text-red-600">Service offline</span>
                      <Badge variant="secondary" className="bg-red-100 text-red-700">
                        Start MJAK automation service
                      </Badge>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Say commands like "open Google", "create a document", or "send email" to automate your computer
                </p>
              </div>
            )}

            {/* Spotify Status */}
            {isSpotifyEnabled && (
              <div>
                <label className="text-sm font-medium mb-2 block">Spotify Status</label>
                <div className="flex items-center gap-2">
                  {isSpotifyConnected ? (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-green-600">Connected</span>
                      <Badge variant="secondary" className="bg-green-100 text-green-700">
                        Ready for music commands
                      </Badge>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                      <span className="text-sm text-muted-foreground">Not connected</span>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => spotifyService.initiateAuth()}
                        className="border-green-200 hover:bg-green-50 text-green-600"
                      >
                        Connect Spotify
                      </Button>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Say "connect Spotify" or "play [song] by [artist]" to control music
                </p>
              </div>
            )}
          </CardContent>
        </Card>

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

        {/* Floating Action Button (FAB) and Menu */}
        <div style={{ position: 'fixed', right: 32, bottom: 32, zIndex: 100 }}>
          <div className="relative flex flex-col items-end">
            {/* Action Buttons (show when fabOpen) */}
            <div className={`flex flex-col items-end gap-4 mb-2 transition-all duration-300 ${fabOpen ? 'opacity-100 translate-y-0' : 'opacity-0 pointer-events-none translate-y-4'}`}>
              {/* Spotify Button */}
              <button
                className="w-[60px] h-[60px] flex items-center justify-center p-1 rounded-full border border-green-500/20 bg-[#181818] shadow-lg hover:shadow-green-500/30 hover:scale-110 transition-all duration-300 group"
                onClick={() => spotifyService.initiateAuth()}
                title="Connect Spotify"
              >
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="#1DB954">
                  <title>Spotify</title>
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                </svg>
              </button>
              {/* Automate Button */}
              <div className="w-[60px] h-[60px] flex items-center justify-center p-1 rounded-full border border-gray-500/20 bg-[#181818] shadow-lg hover:shadow-gray-500/30 hover:scale-110 transition-all duration-300 group">
                <AutomatePowerSwitch checked={isAutomateEnabled} onChange={handleAutomateToggle} />
              </div>
              {/* Upload Button */}
              <label className="w-[60px] h-[60px] flex items-center justify-center p-1 rounded-full border border-blue-500/20 bg-[#181818] shadow-lg hover:shadow-blue-500/30 hover:scale-110 transition-all duration-300 group cursor-pointer">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={async (e) => {
                    const files = e.target.files;
                    if (!files || !user) return;
                    const file = files[0];
                    if (!(await import('@/services/documentService')).documentService.isFileTypeSupported(file)) {
                      toast({
                        title: "Unsupported File Type",
                        description: "Please upload .pdf files only.",
                        variant: "destructive"
                      });
                      return;
                    }
                    try {
                      const { documentService } = await import('@/services/documentService');
                      const uploadedDoc = await documentService.uploadDocument(file, user.id);
                      setLastUploadedDocument(uploadedDoc);
                      toast({
                        title: "Upload Successful",
                        description: "Should I summarize the file or if you wish anything else let me know."
                      });
                      await handleDocumentUpload("Upload successful! Should I summarize the file or if you wish anything else let me know.", uploadedDoc);
                    } catch (error) {
                      toast({
                        title: "Upload Failed",
                        description: error instanceof Error ? error.message : "Failed to upload document.",
                        variant: "destructive"
                      });
                    } finally {
                      e.target.value = '';
                    }
                  }}
                  className="hidden"
                />
                {/* Inline SVG PDF icon, blue color */}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-8 h-8" fill="#3b82f6">
                  <path d="M128 64C92.7 64 64 92.7 64 128L64 512C64 547.3 92.7 576 128 576L208 576L208 464C208 428.7 236.7 400 272 400L448 400L448 234.5C448 217.5 441.3 201.2 429.3 189.2L322.7 82.7C310.7 70.7 294.5 64 277.5 64L128 64zM389.5 240L296 240C282.7 240 272 229.3 272 216L272 122.5L389.5 240zM272 444C261 444 252 453 252 464L252 592C252 603 261 612 272 612C283 612 292 603 292 592L292 564L304 564C337.1 564 364 537.1 364 504C364 470.9 337.1 444 304 444L272 444zM304 524L292 524L292 484L304 484C315 484 324 493 324 504C324 515 315 524 304 524zM400 444C389 444 380 453 380 464L380 592C380 603 389 612 400 612L432 612C460.7 612 484 588.7 484 560L484 496C484 467.3 460.7 444 432 444L400 444zM420 572L420 484L432 484C438.6 484 444 489.4 444 496L444 560C444 566.6 438.6 572 432 572L420 572zM508 464L508 592C508 603 517 612 528 612C539 612 548 603 548 592L548 548L576 548C587 548 596 539 596 528C596 517 587 508 576 508L548 508L548 484L576 484C587 484 596 475 596 464C596 453 587 444 576 444L528 444C517 444 508 453 508 464z"/>
                </svg>
              </label>
              {/* Logout Button */}
              <button
                onClick={handleSignOut}
                className="w-[60px] h-[60px] flex items-center justify-center p-1 rounded-full border border-red-500/20 bg-[#181818] shadow-lg hover:shadow-red-500/30 hover:scale-110 transition-all duration-300 group"
                title="Logout"
              >
                <svg className="w-7 h-7 text-red-500 group-hover:text-red-400 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
            {/* Main FAB (+) Button */}
            <button
              className={`relative w-[60px] h-[60px] rounded-full bg-[#2e2e2e] shadow-lg flex items-center justify-center transition-all duration-200 ${fabOpen ? 'scale-90' : 'scale-100'}`}
              style={{ boxShadow: '0 6px 10px 0 rgba(0,0,0,0.3)' }}
              onClick={() => setFabOpen(v => !v)}
              aria-label="Open actions"
            >
              <svg className={`transition-transform duration-500 w-[30px] h-[30px] ${fabOpen ? 'rotate-45' : 'rotate-0'}`} viewBox="0 0 48 48" width="48" height="48">
                <circle cx="24" cy="24" r="24" fill="none" />
                <g>
                  <rect x="22" y="12" width="4" height="24" rx="2" fill="#fff" />
                  <rect x="12" y="22" width="24" height="4" rx="2" fill="#fff" />
                </g>
              </svg>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>Built with Web Speech API & ElevenLabs • Works best in Chrome and Edge browsers</p>
        </div>
      </div>
    </div>
  );
};

export default Index;
