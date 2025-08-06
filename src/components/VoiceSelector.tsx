
import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useVoiceSelection } from '@/hooks/useVoiceSelection';

export const VoiceSelector = () => {
  const { selectedVoice, updateVoice, availableVoices } = useVoiceSelection();

  return (
    <div className="flex items-center space-x-2">
      <label htmlFor="voice-selector" className="text-sm font-medium">
        Voice:
      </label>
      <Select value={selectedVoice} onValueChange={updateVoice}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select voice" />
        </SelectTrigger>
        <SelectContent>
          {availableVoices.map((voice) => (
            <SelectItem key={voice.id} value={voice.id}>
              {voice.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
