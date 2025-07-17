import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Mic, MicOff, Download, Trash2, Volume2, VolumeX, LogOut, Bot } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { textToSpeechService, AVAILABLE_VOICES } from '@/services/textToSpeechService';
import { llmService, ConversationMessage } from '@/services/llmService';
import { actionRouter } from '@/services/actionRouter';
import { spotifyService } from '@/services/spotifyService';
import { automateService } from '@/services/automateService';
import { supabase } from '@/integrations/supabase/client';
import DocumentUpload from '@/components/DocumentUpload';
import spotifyIcon from '@/assets/spotify-icon.svg';

interface TranscriptEntry {
  id: string;
  text: string;
  timestamp: Date;
  confidence?: number;
}

const Index = () => {
  const { user, loading, signOut } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const [selectedVoice, setSelectedVoice] = useState('JBFqnCBsd6RMkjVDRZzb');
  const [isPlayingTTS, setIsPlayingTTS] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [isProcessingLLM, setIsProcessingLLM] = useState(false);
  const [isSpotifyConnected, setIsSpotifyConnected] = useState(false);
  const [isSpotifyEnabled, setIsSpotifyEnabled] = useState(false);
  const [isAutomateEnabled, setIsAutomateEnabled] = useState(false);
  const [isAutomateConnected, setIsAutomateConnected] = useState(false);
  const [userName, setUserName] = useState('');
  const [lastUploadedDocument, setLastUploadedDocument] = useState<any>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const { toast } = useToast();

  // Redirect to auth if not logged in and get user name
  useEffect(() => {
    if (!loading && !user) {
      window.location.href = '/auth';
    } else if (user) {
      // Get user profile to fetch name
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

  // Check automation service connection
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
    // Check connection every 30 seconds when automate is enabled
    const interval = isAutomateEnabled ? setInterval(checkAutomateConnection, 30000) : null;

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAutomateEnabled, toast]);

  // Check Spotify connection status and handle OAuth callback
  useEffect(() => {
    const checkSpotifyConnection = async () => {
      if (user) {
        // Check for Spotify OAuth callback
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        
        if (code && state) {
          // Handle Spotify OAuth callback
          try {
            const success = await spotifyService.handleCallback(code, state);
            if (success) {
              setIsSpotifyConnected(true);
              toast({
                title: "Spotify Connected!",
                description: "You can now control music with voice commands.",
              });
              // Clean URL
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
          // Check existing connection
          const connected = await spotifyService.isConnected();
          setIsSpotifyConnected(connected);
        }
      }
    };
    checkSpotifyConnection();
  }, [user, toast]);

  useEffect(() => {
    // Check if speech recognition is supported
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setIsSupported(false);
      toast({
        title: "Not Supported",
        description: "Speech recognition is not supported in this browser. Please use Chrome or Edge.",
        variant: "destructive"
      });
      return;
    }

    // Initialize speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    
    if (recognitionRef.current) {
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
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

        if (finalTranscript) {
          const newEntry: TranscriptEntry = {
            id: Date.now().toString(),
            text: finalTranscript.trim(),
            timestamp: new Date(),
            confidence: event.results[event.results.length - 1][0].confidence
          };
          
          setTranscript(prev => [...prev, newEntry]);
          setCurrentTranscript('');
          
          // Process through LLM and convert to speech
          handleConversationalResponse(finalTranscript.trim());
        } else {
          setCurrentTranscript(interimTranscript);
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        toast({
          title: "Recognition Error",
          description: `Error: ${event.error}. Please try again.`,
          variant: "destructive"
        });
        setIsRecording(false);
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
        setCurrentTranscript('');
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [toast]);

  const handleConversationalResponse = async (userInput: string) => {
    if (!userInput.trim()) return;

    setIsProcessingLLM(true);
    
    try {
      // Check if this is related to a recently uploaded document
      let enrichedInput = userInput;
      if (lastUploadedDocument && 
          (userInput.toLowerCase().includes('summarize') || 
           userInput.toLowerCase().includes('extract') || 
           userInput.toLowerCase().includes('format') ||
           userInput.toLowerCase().includes('question'))) {
        // Add document context to the input
        enrichedInput = `${userInput} (document: ${lastUploadedDocument.id})`;
      }

      // Use action router to process input and detect intents
      const { intent, actionResult, llmResponse } = await actionRouter.processUserInput(
        enrichedInput,
        conversationHistory,
        isAutomateEnabled
      );

      console.log('Intent detected:', intent);

      // Handle action results
      if (actionResult) {
        if (actionResult.requiresTTS && actionResult.message) {
          setIsProcessingLLM(false);
          await handleTextToSpeech(actionResult.message);
        }

        // Update Spotify connection status if needed
        if (intent.intent === 'connect_spotify' && actionResult.success) {
          setIsSpotifyConnected(true);
        }

        // Add action result to conversation history
        const newHistory = [
          ...conversationHistory,
          { role: 'user' as const, content: userInput },
          { role: 'assistant' as const, content: actionResult.message }
        ];
        setConversationHistory(newHistory);
      } else if (llmResponse) {
        // Handle normal conversation
        const { updatedHistory } = await llmService.generateResponse(userInput, conversationHistory);
        setConversationHistory(updatedHistory);
        setIsProcessingLLM(false);
        await handleTextToSpeech(llmResponse);
      }

    } catch (error) {
      console.error('Conversational response error:', error);
      setIsProcessingLLM(false);
      toast({
        title: "AI Error",
        description: error instanceof Error ? error.message : "Failed to process your request.",
        variant: "destructive"
      });
    }
  };

  const handleTextToSpeech = async (text: string) => {
    if (!text.trim()) return;

    setIsPlayingTTS(true);
    try {
      const audioBuffer = await textToSpeechService.convertTextToSpeech(text, selectedVoice);
      await textToSpeechService.playAudio(audioBuffer);
    } catch (error) {
      console.error('Text-to-speech error:', error);
      toast({
        title: "TTS Error",
        description: error instanceof Error ? error.message : "Failed to convert text to speech.",
        variant: "destructive"
      });
    } finally {
      setIsPlayingTTS(false);
    }
  };

  const saveTranscriptionSession = async (transcriptText: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('transcription_sessions')
        .insert({
          user_id: user.id,
          transcript: transcriptText,
        });

      if (error) {
        console.error('Error saving transcription:', error);
      }
    } catch (error) {
      console.error('Error saving transcription session:', error);
    }
  };

  const startRecording = () => {
    if (!recognitionRef.current) return;
    
    try {
      recognitionRef.current.start();
      setIsRecording(true);
      toast({
        title: "Recording Started",
        description: "Speak into your microphone. Your speech will be transcribed in real-time.",
      });
    } catch (error) {
      console.error('Error starting recognition:', error);
      toast({
        title: "Error",
        description: "Failed to start recording. Please try again.",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (!recognitionRef.current) return;
    
    recognitionRef.current.stop();
    setIsRecording(false);
    toast({
      title: "Recording Stopped",
      description: "Transcription session ended.",
    });

    // Save the transcription session
    const fullTranscript = transcript.map(entry => entry.text).join('\n');
    saveTranscriptionSession(fullTranscript);
  };

  const clearTranscript = () => {
    setTranscript([]);
    setCurrentTranscript('');
    toast({
      title: "Transcript Cleared",
      description: "All transcription data has been removed.",
    });
  };

  const downloadTranscript = () => {
    if (transcript.length === 0) {
      toast({
        title: "No Content",
        description: "No transcript available to download.",
        variant: "destructive"
      });
      return;
    }

    const content = transcript
      .map(entry => `[${entry.timestamp.toLocaleTimeString()}] ${entry.text}`)
      .join('\n\n');
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Download Complete",
      description: "Transcript has been downloaded successfully.",
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
      // Try to connect to Spotify
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
        description: "Spotify integration has been disabled. You can still play music by enabling it again.",
      });
    }
  };

  const handleAutomateToggle = async (enabled: boolean) => {
    setIsAutomateEnabled(enabled);
    
    if (enabled) {
      // Check if automation service is running
      const connected = await automateService.checkConnection();
      setIsAutomateConnected(connected);
      
      if (connected) {
        toast({
          title: "Automation Enabled",
          description: "You can now automate your computer with voice commands like 'open Google' or 'create a document'.",
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
    
    // Automatically turn on microphone and prompt user for action
    const promptMessage = "PDF uploaded successfully! What would you like me to do with this PDF? I can summarize, extract text, format it, or answer questions about it.";
    
    await handleTextToSpeech(promptMessage);
    
    // Auto-start recording if not already recording
    if (!isRecording) {
      setTimeout(() => {
        startRecording();
      }, 3000); // Give 3 seconds for the TTS to finish
    }
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
    return null; // Will redirect to auth
  }

  if (!isSupported) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-red-600">Not Supported</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">
              Speech recognition is not supported in this browser. Please use Chrome, Edge, or another Chromium-based browser.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header with toggles and logout */}
        <div className="text-center space-y-2">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Welcome, {userName || user.email}</span>
            </div>
            <div className="flex items-center gap-4">
              {/* Automate Toggle */}
              <div className="flex items-center gap-2">
                <Bot className={`w-5 h-5 ${isAutomateEnabled ? 'text-blue-600' : 'text-gray-400'}`} />
                <Switch
                  checked={isAutomateEnabled}
                  onCheckedChange={handleAutomateToggle}
                  className="data-[state=checked]:bg-blue-500"
                />
              </div>
              
              {/* Spotify Toggle */}
              <div className="flex items-center gap-2">
                <img 
                  src={spotifyIcon} 
                  alt="Spotify" 
                  className={`w-5 h-5 ${isSpotifyEnabled ? 'opacity-100' : 'opacity-50'}`}
                  style={{ filter: isSpotifyEnabled ? 'hue-rotate(90deg) saturate(1.5)' : 'grayscale(100%)' }}
                />
                <Switch
                  checked={isSpotifyEnabled}
                  onCheckedChange={handleSpotifyToggle}
                  className="data-[state=checked]:bg-green-500"
                />
              </div>
              
              {/* Sign Out Button */}
              <Button onClick={signOut} variant="outline" size="sm" className="rounded-full p-2">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Conversational AI Assistant
          </h1>
          <p className="text-lg text-muted-foreground">
            Speech → AI Intelligence → Speech powered by Assembly AI, Llama 3.3 & ElevenLabs
          </p>
        </div>

        {/* Voice Settings */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-sm">Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Voice Settings</label>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a voice" />
                    </SelectTrigger>
                    <SelectContent>
                      {AVAILABLE_VOICES.map((voice) => (
                        <SelectItem key={voice.id} value={voice.id}>
                          {voice.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {isPlayingTTS && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Volume2 className="w-4 h-4 animate-pulse" />
                    Playing...
                  </div>
                )}
              </div>
            </div>

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

        {/* Control Panel */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                onClick={isRecording ? stopRecording : startRecording}
                size="lg"
                className={`w-full sm:w-auto px-8 py-3 text-lg font-semibold transition-all duration-300 ${
                  isRecording 
                    ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                    : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700'
                }`}
              >
                {isRecording ? (
                  <>
                    <MicOff className="w-5 h-5 mr-2" />
                    Stop Recording
                  </>
                ) : (
                  <>
                    <Mic className="w-5 h-5 mr-2" />
                    Start Recording
                  </>
                )}
              </Button>
              
              <div className="flex gap-2">
                <Button
                  onClick={downloadTranscript}
                  variant="outline"
                  disabled={transcript.length === 0}
                  className="border-blue-200 hover:bg-blue-50"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button
                  onClick={clearTranscript}
                  variant="outline"
                  disabled={transcript.length === 0}
                  className="border-red-200 hover:bg-red-50 text-red-600"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear
                </Button>
              </div>
            </div>

            {(isRecording || isPlayingTTS || isProcessingLLM) && (
              <div className="mt-4 flex items-center justify-center gap-4">
                {isRecording && (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-muted-foreground">Recording in progress...</span>
                  </div>
                )}
                {isProcessingLLM && (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-spin"></div>
                    <span className="text-sm text-muted-foreground">AI thinking...</span>
                  </div>
                )}
                {isPlayingTTS && (
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-green-500 animate-pulse" />
                    <span className="text-sm text-muted-foreground">Playing AI response...</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Live Transcript */}
        {(currentTranscript || isRecording) && (
          <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                Live Transcript
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg text-gray-700 min-h-[3rem] leading-relaxed">
                {currentTranscript || (isRecording ? "Listening..." : "")}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Transcript History */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Transcript History</span>
              {transcript.length > 0 && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                  {transcript.length} entries
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {transcript.length === 0 ? (
              <div className="text-center py-12">
                <Mic className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                <p className="text-muted-foreground text-lg">No transcripts yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Click "Start Recording" to begin transcribing your speech
                </p>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {transcript.map((entry, index) => (
                  <div
                    key={entry.id}
                    className="p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border border-gray-200 hover:shadow-md transition-shadow duration-200"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          #{index + 1}
                        </Badge>
                        {textToSpeechService.isConfigured() && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleTextToSpeech(entry.text)}
                            disabled={isPlayingTTS}
                            className="h-6 px-2 text-xs"
                          >
                            {isPlayingTTS ? (
                              <VolumeX className="w-3 h-3" />
                            ) : (
                              <Volume2 className="w-3 h-3" />
                            )}
                          </Button>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <span>{formatTimestamp(entry.timestamp)}</span>
                        {entry.confidence && (
                          <Badge variant="secondary" className="text-xs">
                            {Math.round(entry.confidence * 100)}% confidence
                          </Badge>
                        )}
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

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>Built with Web Speech API & ElevenLabs • Works best in Chrome and Edge browsers</p>
        </div>
      </div>
    </div>
  );
};

export default Index;
