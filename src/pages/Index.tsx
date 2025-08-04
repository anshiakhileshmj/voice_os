import React, { useState, useEffect, useCallback } from 'react';
import { Button, Input } from '@nextui-org/react';
import { useToast } from '@/hooks/use-toast';
import { LLMService } from '@/services/llmService';
import { ActionRouter } from '@/services/actionRouter';
import { SpeechRecognitionService } from '@/services/speechRecognitionService';
import { textToSpeechService } from '@/services/textToSpeechService';
import { consolidatedTTSService } from '@/services/consolidatedTTSService';

const Index = () => {
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const { toast } = useToast();
  const llmService = LLMService.getInstance();
  const actionRouter = ActionRouter.getInstance();
  const speechRecognitionService = SpeechRecognitionService.getInstance();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
  };

  const handleSpeechToText = async (audioBlob: Blob) => {
    const recognition = speechRecognitionService.getRecognition();

    recognition.onstart = () => {
      console.log('Speech recognition started');
      setIsListening(true);
    };

    recognition.onend = () => {
      console.log('Speech recognition ended');
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      toast({
        title: 'Speech Recognition Error',
        description: `Error: ${event.error}`,
        variant: 'destructive',
      });
    };

    recognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript;
      console.log('Speech recognized:', transcript);
      setInputText(transcript);
      
      try {
        // Process user input and get response
        const llmResult = await llmService.processUserInput(transcript);
        console.log('Intent detected:', llmResult);
        
        // Get the response text to convert to speech
        const responseText = llmResult.response || "I understand. How can I help you?";
        
        // Convert response to speech using custom TTS
        console.log('Converting text to speech:', responseText.substring(0, 50) + '...');
        
        try {
          const { audioBlob: ttsAudioBlob, modelUsed } = await consolidatedTTSService.convertTextToSpeech(
            responseText,
            'female-en-us'
          );
          
          console.log(`Successfully received audio data from ${modelUsed}: ${ttsAudioBlob.size} bytes`);
          
          // Play the audio response
          await consolidatedTTSService.playAudio(ttsAudioBlob);
          console.log('Audio playback completed successfully');
          
        } catch (ttsError) {
          console.error('Text-to-speech error:', ttsError);
          // Don't throw here, just log the error so the conversation can continue
        }
        
        // Route the action based on intent
        await actionRouter.routeAction(llmResult, transcript);
        
      } catch (error) {
        console.error('Error processing speech:', error);
      }
    };

    recognition.start();
  };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      let audioChunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        audioChunks = [];
        handleSpeechToText(audioBlob);
      };

      mediaRecorder.start();
      toast({
        description: 'Recording started. Speak now...',
      });

      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
          toast({
            description: 'Recording stopped.',
          });
        }
      }, 5000);
    } catch (error: any) {
      console.error('Error starting recording:', error);
      toast({
        title: 'Recording Error',
        description: `Error: ${error.message}`,
        variant: 'destructive',
      });
      setIsListening(false);
    }
  }, [toast]);

  const handleSubmit = async () => {
    if (!inputText.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter some text.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Process user input and get response
      const llmResult = await llmService.processUserInput(inputText);
      console.log('LLM Result:', llmResult);

      // Get the response text to convert to speech
      const responseText = llmResult.response || "I understand. How can I help you?";

      // Convert response to speech using custom TTS
      console.log('Converting text to speech:', responseText.substring(0, 50) + '...');
      
      try {
        const { audioBlob: ttsAudioBlob, modelUsed } = await consolidatedTTSService.convertTextToSpeech(
          responseText,
          'female-en-us'
        );
        
        console.log(`Successfully received audio data from ${modelUsed}: ${ttsAudioBlob.size} bytes`);
        
        // Play the audio response
        await consolidatedTTSService.playAudio(ttsAudioBlob);
        console.log('Audio playback completed successfully');
        
      } catch (ttsError) {
        console.error('Text-to-speech error:', ttsError);
        // Don't throw here, just log the error so the conversation can continue
      }

      // Route the action based on intent
      await actionRouter.routeAction(llmResult, inputText);

    } catch (error: any) {
      console.error('Error processing input:', error);
      toast({
        title: 'Processing Error',
        description: `Error: ${error.message}`,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Voice OS</h1>
      <Input
        type="text"
        placeholder="Enter text or speak..."
        value={inputText}
        onChange={handleInputChange}
        className="mb-4"
      />
      <div className="flex gap-4">
        <Button color="primary" onClick={handleSubmit}>
          Submit
        </Button>
        <Button color="secondary" onClick={startRecording} disabled={isListening}>
          {isListening ? 'Listening...' : 'Speak'}
        </Button>
      </div>
    </div>
  );
};

export default Index;
