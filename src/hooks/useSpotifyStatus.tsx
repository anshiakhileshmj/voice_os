
import { useState, useEffect } from 'react';
import { spotifyService } from '@/services/spotifyService';

export const useSpotifyStatus = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [spotifyData, setSpotifyData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const checkStatus = async () => {
    try {
      const connected = await spotifyService.isConnected();
      setIsConnected(connected);
      
      if (connected) {
        const data = await spotifyService.getDetailedSpotifyInfo();
        setSpotifyData(data);
      } else {
        setSpotifyData(null);
      }
    } catch (error) {
      console.error('Error checking Spotify status:', error);
      setIsConnected(false);
      setSpotifyData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const refreshStatus = () => {
    setLoading(true);
    checkStatus();
  };

  return {
    isConnected,
    spotifyData,
    loading,
    refreshStatus
  };
};
