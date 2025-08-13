
import React, { useState } from 'react';
import { X } from 'lucide-react';

const SpotifyNote: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="relative mx-auto max-w-md px-4">
      <div 
        className="relative rounded-lg border border-white/10 p-4 shadow-lg"
        style={{ backgroundColor: 'rgb(33,33,33)' }}
      >
        <button
          onClick={() => setIsVisible(false)}
          className="absolute right-2 top-2 rounded-full p-1 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Dismiss note"
        >
          <X className="h-4 w-4" />
        </button>
        
        <div className="pr-8">
          <p className="text-white text-sm text-center leading-relaxed">
            Spotify feature is currently being built. We'll send you mail once it's live. Thanks.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SpotifyNote;
