
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { spotifyService } from '@/services/spotifyService';
import { useToast } from '@/hooks/use-toast';

export const useSpotifyCallback = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const handleSpotifyCallback = async () => {
      const urlParams = new URLSearchParams(location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      const error = urlParams.get('error');

      // If there's an error parameter, handle it
      if (error) {
        console.error('Spotify auth error:', error);
        toast({
          title: "Spotify Connection Failed",
          description: `Authentication error: ${error}`,
          variant: "destructive"
        });
        
        // Clean URL and stay on app page
        navigate('/app', { replace: true });
        return;
      }

      // If we have both code and state, process the callback
      if (code && state) {
        try {
          console.log('Processing Spotify callback with code:', code, 'and state:', state);
          
          const success = await spotifyService.handleCallback(code, state);
          
          if (success) {
            toast({
              title: "Spotify Connected!",
              description: "Your Spotify account has been successfully connected.",
            });
          } else {
            toast({
              title: "Connection Failed",
              description: "Failed to connect your Spotify account. Please try again.",
              variant: "destructive"
            });
          }
        } catch (error) {
          console.error('Spotify callback processing error:', error);
          toast({
            title: "Connection Error",
            description: error instanceof Error ? error.message : "An error occurred while connecting Spotify.",
            variant: "destructive"
          });
        }

        // Clean the URL by navigating back to app without the query parameters
        navigate('/app', { replace: true });
      }
    };

    handleSpotifyCallback();
  }, [location.search, navigate, toast]);
};
