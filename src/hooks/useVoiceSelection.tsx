
import { useState, useEffect } from 'react';
import { simplifiedActionRouter } from '@/services/simplifiedActionRouter';
import { languageDetectionService } from '@/services/languageDetectionService';
import { AVAILABLE_VOICES } from '@/services/textToSpeechService';

export const useVoiceSelection = () => {
  const [selectedVoice, setSelectedVoice] = useState('english_us_male');
  const [isAutoDetectEnabled, setIsAutoDetectEnabled] = useState(false);

  const updateVoice = (voiceId: string) => {
    console.log('useVoiceSelection: Manually updating voice to:', voiceId);
    setSelectedVoice(voiceId);
    simplifiedActionRouter.setSelectedVoice(voiceId);
    
    // Disable auto-detection when manually selecting voice
    if (isAutoDetectEnabled) {
      setIsAutoDetectEnabled(false);
      languageDetectionService.disableDetection();
      simplifiedActionRouter.setAutoDetectLanguage(false);
    }
  };

  const toggleAutoDetect = (enabled: boolean) => {
    console.log('useVoiceSelection: Auto-detect toggled:', enabled);
    setIsAutoDetectEnabled(enabled);
    
    if (enabled) {
      languageDetectionService.enableDetection();
      simplifiedActionRouter.setAutoDetectLanguage(true);
    } else {
      languageDetectionService.disableDetection();
      simplifiedActionRouter.setAutoDetectLanguage(false);
      // Reset to default voice when disabling auto-detection
      setSelectedVoice('english_us_male');
      simplifiedActionRouter.setSelectedVoice('english_us_male');
    }
  };

  // Initialize with default voice
  useEffect(() => {
    simplifiedActionRouter.setSelectedVoice(selectedVoice);
    simplifiedActionRouter.setAutoDetectLanguage(isAutoDetectEnabled);
  }, []);

  return {
    selectedVoice,
    updateVoice,
    availableVoices: AVAILABLE_VOICES,
    isAutoDetectEnabled,
    toggleAutoDetect
  };
};
