
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Volume2, Loader2, Play, Square } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TTSResponse {
  audio_data: string;
  content_type: string;
  text: string;
}

const TTSTestPanel = () => {
  const [text, setText] = useState('Hello! This is a test of the male English text-to-speech system.');
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [serverStatus, setServerStatus] = useState<'unknown' | 'online' | 'offline'>('unknown');
  const { toast } = useToast();

  const checkServerHealth = async () => {
    try {
      const response = await fetch('http://localhost:5001/health');
      if (response.ok) {
        setServerStatus('online');
        return true;
      } else {
        setServerStatus('offline');
        return false;
      }
    } catch (error) {
      setServerStatus('offline');
      return false;
    }
  };

  const synthesizeSpeech = async () => {
    if (!text.trim()) {
      toast({
        title: "Error",
        description: "Please enter some text to synthesize",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Check server health first
      const serverOnline = await checkServerHealth();
      if (!serverOnline) {
        throw new Error('TTS server is not running. Please start the Python server first.');
      }

      console.log('Sending text to TTS server:', text.substring(0, 50) + '...');

      const response = await fetch('http://localhost:5001/synthesize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to synthesize speech');
      }

      const data: TTSResponse = await response.json();
      console.log('Received TTS response, playing audio...');

      // Stop any currently playing audio
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }

      // Create audio from base64 data
      const audioBlob = new Blob(
        [Uint8Array.from(atob(data.audio_data), c => c.charCodeAt(0))], 
        { type: data.content_type }
      );
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      // Set up audio event listeners
      audio.onplay = () => setIsPlaying(true);
      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
        setCurrentAudio(null);
      };
      audio.onerror = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
        setCurrentAudio(null);
        toast({
          title: "Audio Error",
          description: "Failed to play the generated audio",
          variant: "destructive",
        });
      };

      setCurrentAudio(audio);
      await audio.play();

      toast({
        title: "Success",
        description: "Speech synthesized and playing!",
      });

    } catch (error) {
      console.error('TTS Error:', error);
      toast({
        title: "TTS Error",
        description: error instanceof Error ? error.message : "Failed to synthesize speech",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const stopAudio = () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setIsPlaying(false);
    }
  };

  const getServerStatusColor = () => {
    switch (serverStatus) {
      case 'online': return 'text-green-600';
      case 'offline': return 'text-red-600';
      default: return 'text-gray-500';
    }
  };

  const getServerStatusText = () => {
    switch (serverStatus) {
      case 'online': return 'Server Online';
      case 'offline': return 'Server Offline';
      default: return 'Checking...';
    }
  };

  React.useEffect(() => {
    // Check server status on mount
    checkServerHealth();
    
    // Cleanup on unmount
    return () => {
      if (currentAudio) {
        currentAudio.pause();
        setCurrentAudio(null);
      }
    };
  }, []);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="h-5 w-5" />
          TTS Test Panel
        </CardTitle>
        <CardDescription>
          Test the Coqui TTS male English voice system
        </CardDescription>
        <div className="flex items-center gap-2 text-sm">
          <div className={`w-2 h-2 rounded-full ${serverStatus === 'online' ? 'bg-green-500' : serverStatus === 'offline' ? 'bg-red-500' : 'bg-gray-400'}`} />
          <span className={getServerStatusColor()}>{getServerStatusText()}</span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={checkServerHealth}
            className="ml-auto"
          >
            Check Status
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="tts-text" className="text-sm font-medium">
            Enter text to synthesize:
          </label>
          <Input
            id="tts-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type something to convert to speech..."
            disabled={isLoading || isPlaying}
          />
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={synthesizeSpeech} 
            disabled={isLoading || isPlaying || !text.trim() || serverStatus !== 'online'}
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Synthesize & Play
              </>
            )}
          </Button>

          {isPlaying && (
            <Button 
              onClick={stopAudio} 
              variant="outline"
              className="flex items-center gap-2"
            >
              <Square className="h-4 w-4" />
              Stop
            </Button>
          )}
        </div>

        {serverStatus === 'offline' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="text-yellow-800 font-medium mb-2">Server Setup Required</h4>
            <p className="text-yellow-700 text-sm mb-2">
              To use the TTS system, you need to start the Python server:
            </p>
            <ol className="text-yellow-700 text-sm list-decimal list-inside space-y-1">
              <li>Open a terminal and navigate to the <code className="bg-yellow-100 px-1 rounded">tts</code> directory</li>
              <li>Run: <code className="bg-yellow-100 px-1 rounded">python start_server.py</code></li>
              <li>Wait for the server to download models and start</li>
              <li>Come back and click "Check Status"</li>
            </ol>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TTSTestPanel;
