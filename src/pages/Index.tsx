import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { actionRouter, ActionResult, IntentResult } from '@/services/actionRouter';
import { llmService, ConversationMessage } from '@/services/llmService';
import { textToSpeechService } from '@/services/textToSpeechService';
import { automateService } from '@/services/automateService';
import { spotifyService } from '@/services/spotifyService';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import FloatingActionButtons from '@/components/FloatingActionButtons';
import AnimatedCallButton from '@/components/AnimatedCallButton';
import FeedbackModal from '@/components/FeedbackModal';
import { useSpotifyCallback } from '@/hooks/useSpotifyCallback';

const Index = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [llmResponse, setLlmResponse] = useState('');
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [isAutomateEnabled, setIsAutomateEnabled] = useState(false);
  const [isAutomateConnected, setIsAutomateConnected] = useState(false);
  const [isSpotifyEnabled, setIsSpotifyEnabled] = useState(false);
  const [isSpotifyConnected, setIsSpotifyConnected] = useState(false);
  const [actionResult, setActionResult] = useState<ActionResult | undefined>(undefined);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [lastIntent, setLastIntent] = useState<IntentResult | undefined>(undefined);
  const [documentResponse, setDocumentResponse] = useState<string | undefined>(undefined);
  const [document, setDocument] = useState<any | undefined>(undefined);
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    startListening,
    stopListening,
    resetTranscription,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();
  const recognitionRef = useRef<any>(null);

  // Add Spotify callback handling
  useSpotifyCallback();

  useEffect(() => {
    const checkAutomateConnection = async () => {
      const isConnected = await automateService.checkConnection();
      setIsAutomateConnected(isConnected);
    };

    checkAutomateConnection();
  }, [isAutomateEnabled]);

  useEffect(() => {
    const checkSpotifyConnection = async () => {
      const isConnected = await spotifyService.isConnected();
      setIsSpotifyConnected(isConnected);
    };

    checkSpotifyConnection();
  }, [isSpotifyEnabled]);

  useEffect(() => {
    if (!browserSupportsSpeechRecognition) {
      toast({
        title: "Browser Not Supported",
        description: "Your browser does not support speech recognition. Please try a different browser.",
        variant: "destructive"
      });
    }
  }, [browserSupportsSpeechRecognition, toast]);

  useEffect(() => {
    if (transcription && isListening) {
      processInput(transcription);
    }
  }, [transcription, isListening]);

  const processInput = async (input: string) => {
    try {
      const { intent, actionResult, llmResponse } = await actionRouter.processUserInput(
        input,
        conversationHistory,
        isAutomateEnabled
      );

      setLastIntent(intent);
      setActionResult(actionResult);
      setLlmResponse(llmResponse || '');

      if (actionResult?.requiresTTS && actionResult?.message) {
        speak(actionResult.message);
      } else if (llmResponse) {
        speak(llmResponse);
      }

      // Store conversation history
      setConversationHistory(prevHistory => [
        ...prevHistory,
        { role: 'user', content: input },
        { role: 'assistant', content: llmResponse || actionResult?.message || '' }
      ]);
    } catch (error) {
      console.error('Error processing input:', error);
      setLlmResponse("I'm sorry, I encountered an error. Please try again.");
      speak("I'm sorry, I encountered an error. Please try again.");
    } finally {
      resetTranscription();
      setIsListening(false);
    }
  };

  const speak = async (text: string) => {
    try {
      await textToSpeechService.speak(text);
    } catch (error) {
      console.error('Text-to-speech error:', error);
      toast({
        title: "Text-to-Speech Error",
        description: "There was an error synthesizing speech. Please check your settings or try again later.",
        variant: "destructive"
      });
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
      setIsListening(false);
    } else {
      startListening();
      setIsListening(true);
    }
  };

  const handleAutomateToggle = (enabled: boolean) => {
    setIsAutomateEnabled(enabled);
  };

  const handleSpotifyToggle = (enabled: boolean) => {
    setIsSpotifyEnabled(enabled);
  };

  const handleDocumentUpload = (response: string, document?: any) => {
    setDocumentResponse(response);
    setDocument(document);
  };

  const openFeedbackModal = () => {
    setFeedbackModalOpen(true);
  };

  const closeFeedbackModal = () => {
    setFeedbackModalOpen(false);
  };

  const submitFeedback = async (feedback: string, rating: number) => {
    try {
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to submit feedback.",
          variant: "destructive"
        });
        return;
      }

      await supabase
        .from('feedback')
        .insert({
          user_id: user.id,
          feedback: feedback,
          rating: rating,
          intent: lastIntent?.intent,
          location_data: null // Add location data if available
        });

      toast({
        title: "Feedback Submitted",
        description: "Thank you for your feedback!",
      });
    } catch (error) {
      console.error('Feedback submission error:', error);
      toast({
        title: "Submission Failed",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive"
      });
    } finally {
      closeFeedbackModal();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-gray-900 to-black text-white">
      <div className="flex-grow p-4">
        <div className="mb-4">
          <p className="text-gray-400">Transcription: {transcription || '...'}</p>
          <p className="text-gray-400">Response: {llmResponse || actionResult?.message || '...'}</p>
          {documentResponse && <p className="text-green-400">{documentResponse}</p>}
        </div>
      </div>

      <div className="flex items-center justify-center p-6">
        <AnimatedCallButton
          isListening={isListening}
          onClick={toggleListening}
        />
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

      <button
        onClick={openFeedbackModal}
        className="fixed bottom-6 left-6 z-50 p-3 rounded-full bg-gray-800 hover:bg-gray-700 text-white shadow-lg"
      >
        Feedback
      </button>

      <FeedbackModal
        isOpen={feedbackModalOpen}
        onClose={closeFeedbackModal}
        onSubmit={submitFeedback}
      />
    </div>
  );
};

export default Index;
