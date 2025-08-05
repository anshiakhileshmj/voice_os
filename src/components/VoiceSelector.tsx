import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Globe, Mic, Volume2, Languages } from 'lucide-react';
import { customTTSService, AVAILABLE_VOICES, Voice } from '@/services/customTTSService';

interface VoiceSelectorProps {
  selectedVoice: string;
  onVoiceChange: (voiceId: string) => void;
}

export default function VoiceSelector({ selectedVoice, onVoiceChange }: VoiceSelectorProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const [selectedGender, setSelectedGender] = useState<'male' | 'female'>('female');

  // Get unique languages
  const languages = Array.from(new Set(AVAILABLE_VOICES.map(v => v.language)));
  
  // Get voices for selected language and gender
  const filteredVoices = AVAILABLE_VOICES.filter(v => 
    v.language === selectedLanguage && v.gender === selectedGender
  );

  const getLanguageName = (code: string) => {
    const names: Record<string, string> = {
      'en': 'English',
      'hi': 'Hindi',
      'de': 'German',
      'fr': 'French'
    };
    return names[code] || code.toUpperCase();
  };

  const getGenderIcon = (gender: string) => {
    return gender === 'female' ? '👩' : '👨';
  };

  const getAccentBadge = (voice: Voice) => {
    if (!voice.accent) return null;
    return (
      <Badge variant="secondary" className="text-xs">
        {voice.accent.toUpperCase()}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Languages className="w-4 h-4" />
          Voice Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Language Selection */}
        <div>
          <label className="text-sm font-medium mb-2 block">Language</label>
          <div className="grid grid-cols-2 gap-2">
            {languages.map(lang => (
              <Button
                key={lang}
                variant={selectedLanguage === lang ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedLanguage(lang)}
                className="justify-start"
              >
                <Globe className="w-3 h-3 mr-2" />
                {getLanguageName(lang)}
              </Button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Gender Selection */}
        <div>
          <label className="text-sm font-medium mb-2 block">Voice Gender</label>
          <div className="flex gap-2">
            <Button
              variant={selectedGender === 'female' ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedGender('female')}
            >
              👩 Female
            </Button>
            <Button
              variant={selectedGender === 'male' ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedGender('male')}
            >
              👨 Male
            </Button>
          </div>
        </div>

        <Separator />

        {/* Voice Selection */}
        <div>
          <label className="text-sm font-medium mb-2 block">Available Voices</label>
          <div className="space-y-2">
            {filteredVoices.map(voice => (
              <div
                key={voice.id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedVoice === voice.id 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => onVoiceChange(voice.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getGenderIcon(voice.gender)}</span>
                    <div>
                      <div className="font-medium text-sm">{voice.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {getLanguageName(voice.language)} • {voice.primary_model}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getAccentBadge(voice)}
                    {selectedVoice === voice.id && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Model Information */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="text-xs text-muted-foreground">
            <div className="font-medium mb-1">TTS Models Used:</div>
            <div>• Edge TTS: High-quality multilingual voices</div>
            <div>• Google TTS: Reliable fallback option</div>
            <div>• Automatic retry and fallback system</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 