
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { streamingLLMService } from '@/services/streamingLLMService';
import { locationService } from '@/services/locationService';
import { toast } from "@/hooks/use-toast";
import AnimatedCallButton from '@/components/AnimatedCallButton';
import FloatingActionButtons from '@/components/FloatingActionButtons';
import PricingIcon from '@/components/PricingIcon';

const Index = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [isListening, setIsListening] = useState(false);
  const [response, setResponse] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [locationData, setLocationData] = useState<{ city: string; region: string; country: string }>({
    city: 'Unknown',
    region: 'Unknown',
    country: 'Unknown',
  });
  const [greeting, setGreeting] = useState('');
  const [isSpotifyEnabled, setIsSpotifyEnabled] = useState(false);
  const [isSpotifyConnected, setIsSpotifyConnected] = useState(false);
  const [isAutomateEnabled, setIsAutomateEnabled] = useState(false);
  const [isAutomateConnected, setIsAutomateConnected] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    const fetchLocationAndGreeting = async () => {
      try {
        const location = await locationService.getUserLocation();
        setLocationData({
          city: location.city,
          region: location.region,
          country: location.country,
        });

        const shouldGreet = await locationService.shouldGreetUser(user.id);
        if (shouldGreet) {
          const userDisplayName = user.email?.split('@')[0] || 'User';
          const newGreeting = locationService.getGreeting(location.timezone, userDisplayName);
          setGreeting(newGreeting);
          await locationService.updateLastGreeted(user.id);
        } else {
          const userDisplayName = user.email?.split('@')[0] || 'User';
          setGreeting(`Welcome back, ${userDisplayName}`);
        }
      } catch (error) {
        console.error('Error fetching location and greeting:', error);
        const userDisplayName = user.email?.split('@')[0] || 'User';
        setGreeting(`Hello, ${userDisplayName}`);
      }
    };

    fetchLocationAndGreeting();
  }, [user, navigate]);

  const handleStartCall = async () => {
    if (isStreaming) {
      streamingLLMService.stopStreaming();
      setIsStreaming(false);
      setIsListening(false);
      return;
    }

    setIsListening(true);
    setIsStreaming(true);
    setResponse('');

    // Simulate voice recognition here - you can integrate actual speech recognition
    const mockUserMessage = "Tell me about the weather";

    try {
      await streamingLLMService.generateStreamingResponse(mockUserMessage, {
        onChunk: (chunk: string) => {
          setResponse(prev => prev + chunk);
        },
        onComplete: (fullResponse: string) => {
          setIsStreaming(false);
          setIsListening(false);
          console.log('Streaming complete:', fullResponse);
        },
        onError: (error: Error) => {
          console.error('Streaming error:', error);
          setIsStreaming(false);
          setIsListening(false);
          toast({
            title: "Error",
            description: error.message,
            variant: "destructive"
          });
        }
      });
    } catch (error) {
      console.error('Call error:', error);
      setIsStreaming(false);
      setIsListening(false);
    }
  };

  const handleSpotifyToggle = (enabled: boolean) => {
    setIsSpotifyEnabled(enabled);
  };

  const handleAutomateToggle = (enabled: boolean) => {
    setIsAutomateEnabled(enabled);
  };

  const handleDocumentUpload = (response: string, document?: any) => {
    toast({
      title: "Document Uploaded",
      description: response,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex flex-col items-center justify-center relative overflow-hidden">
      <PricingIcon />
      
      {/* Header with greeting and location */}
      <div className="absolute top-8 left-8 text-white">
        <h1 className="text-2xl font-semibold">{greeting}</h1>
        <p className="text-gray-400 text-sm">
          {locationData.city}, {locationData.region}, {locationData.country}
        </p>
      </div>

      {/* Main content */}
      <div className="flex flex-col items-center justify-center flex-1 space-y-8">
        {/* Animated Call Button */}
        <AnimatedCallButton 
          label={isStreaming ? "Stop Call" : "Start Call"} 
          onClick={handleStartCall} 
        />

        {/* Response Display */}
        {response && (
          <div className="max-w-2xl mx-auto p-6 bg-black/30 backdrop-blur-lg rounded-2xl border border-white/10">
            <div className="text-white text-center">
              <p className="text-lg leading-relaxed">{response}</p>
            </div>
          </div>
        )}

        {/* Status indicator */}
        {isListening && (
          <div className="flex items-center space-x-2 text-white/70">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm">Listening...</span>
          </div>
        )}
      </div>

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
    </div>
  );
};

export default Index;
