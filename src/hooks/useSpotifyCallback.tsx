
import { useEffect } from 'react';
import { spotifyService } from '@/services/spotifyService';
import { useToast } from '@/hooks/use-toast';

export const useSpotifyCallback = () => {
  const { toast } = useToast();

  useEffect(() => {
    const handleSpotifyCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      const error = urlParams.get('error');

      // Handle Spotify OAuth error
      if (error) {
        console.error('Spotify OAuth error:', error);
        toast({
          title: "Spotify Connection Failed",
          description: `Authentication was cancelled or failed: ${error}`,
          variant: "destructive"
        });
        
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }

      // Handle successful callback
      if (code && state) {
        console.log('Processing Spotify callback...');
        
        try {
          const success = await spotifyService.handleCallback(code, state);
          
          if (success) {
            toast({
              title: "Spotify Connected!",
              description: "You can now control music with voice commands.",
            });
            console.log('Spotify authentication successful');
          } else {
            toast({
              title: "Connection Failed",
              description: "Failed to connect to Spotify. Please try again.",
              variant: "destructive"
            });
            console.error('Spotify authentication failed');
          }
        } catch (error) {
          console.error('Spotify callback processing error:', error);
          toast({
            title: "Connection Error",
            description: error instanceof Error ? error.message : "An error occurred while connecting to Spotify.",
            variant: "destructive"
          });
        }
        
        // Clean up URL parameters after processing
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    };

    // Only run if we have URL parameters that suggest a Spotify callback
    if (window.location.search.includes('code=') || window.location.search.includes('error=')) {
      handleSpotifyCallback();
    }
  }, [toast]);
};
