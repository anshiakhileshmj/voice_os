
import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useVoiceSelection } from '@/hooks/useVoiceSelection';

export const VoiceSelector = () => {
  const { 
    selectedVoice, 
    updateVoice, 
    availableVoices, 
    isAutoDetectEnabled, 
    toggleAutoDetect 
  } = useVoiceSelection();

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex items-center space-x-2">
        <Switch
          id="auto-detect"
          checked={isAutoDetectEnabled}
          onCheckedChange={toggleAutoDetect}
        />
        <Label htmlFor="auto-detect" className="text-sm font-medium">
          Auto-detect language
        </Label>
      </div>
      
      {!isAutoDetectEnabled && (
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
      )}
      
      {isAutoDetectEnabled && (
        <div className="text-sm text-muted-foreground">
          Language will be automatically detected from your speech
        </div>
      )}
    </div>
  );
};
