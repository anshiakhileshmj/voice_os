
import { useState, useEffect } from 'react';
import { simplifiedActionRouter } from '@/services/simplifiedActionRouter';
import { AVAILABLE_VOICES } from '@/services/textToSpeechService';

export const useVoiceSelection = () => {
  const [selectedVoice, setSelectedVoice] = useState('english_us_male');

  const updateVoice = (voiceId: string) => {
    console.log('useVoiceSelection: Updating voice to:', voiceId);
    setSelectedVoice(voiceId);
    simplifiedActionRouter.setSelectedVoice(voiceId);
  };

  // Initialize with default voice
  useEffect(() => {
    simplifiedActionRouter.setSelectedVoice(selectedVoice);
  }, []);

  return {
    selectedVoice,
    updateVoice,
    availableVoices: AVAILABLE_VOICES
  };
};
