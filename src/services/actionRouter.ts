import { fetchWeather } from './weatherService';
import { getCurrentTime } from './timeService';
import { spotifyService } from './spotifyService';
import { subscriptionService } from './subscriptionService';
import { supabase } from '@/integrations/supabase/client';

export async function handleQuickActions(message: string, userId: string): Promise<{ 
  response: string; 
  action?: string; 
  data?: any;
  shouldPlay?: boolean;
}> {
  const lowerMessage = message.toLowerCase();

  // Spotify-related queries with stored data
  if (lowerMessage.includes('spotify') && (
    lowerMessage.includes('name') || 
    lowerMessage.includes('profile') ||
    lowerMessage.includes('who am i') ||
    lowerMessage.includes('my name')
  )) {
    try {
      const profile = await spotifyService.getStoredUserProfile();
      if (profile) {
        return {
          response: `Your Spotify name is ${profile.display_name}. You have a ${profile.product} account from ${profile.country}.`,
          shouldPlay: true
        };
      } else {
        return {
          response: "I don't have your Spotify profile information. Please make sure you've connected your Spotify account.",
          shouldPlay: true
        };
      }
    } catch (error) {
      return {
        response: "I had trouble accessing your Spotify profile information.",
        shouldPlay: true
      };
    }
  }

  if (lowerMessage.includes('playlist')) {
    try {
      const playlists = await spotifyService.getStoredPlaylists();
      if (playlists.length > 0) {
        const playlistNames = playlists.slice(0, 5).map(p => p.name).join(', ');
        return {
          response: `You have ${playlists.length} playlists. Here are some of them: ${playlistNames}`,
          shouldPlay: true
        };
      } else {
        return {
          response: "I don't see any playlists in your Spotify account.",
          shouldPlay: true
        };
      }
    } catch (error) {
      return {
        response: "I had trouble accessing your playlists.",
        shouldPlay: true
      };
    }
  }

  if (lowerMessage.includes('top artist') || lowerMessage.includes('favorite artist')) {
    try {
      const artists = await spotifyService.getStoredTopArtists();
      if (artists.length > 0) {
        const topArtists = artists.slice(0, 3).map(a => a.name).join(', ');
        return {
          response: `Your top artists include: ${topArtists}`,
          shouldPlay: true
        };
      } else {
        return {
          response: "I don't have information about your top artists yet.",
          shouldPlay: true
        };
      }
    } catch (error) {
      return {
        response: "I had trouble accessing your top artists.",
        shouldPlay: true
      };
    }
  }

  if (lowerMessage.includes('top song') || lowerMessage.includes('favorite song')) {
    try {
      const tracks = await spotifyService.getStoredTopTracks();
      if (tracks.length > 0) {
        const topTracks = tracks.slice(0, 3).map(t => `${t.name} by ${t.artist_names}`).join(', ');
        return {
          response: `Your top songs include: ${topTracks}`,
          shouldPlay: true
        };
      } else {
        return {
          response: "I don't have information about your top songs yet.",
          shouldPlay: true
        };
      }
    } catch (error) {
      return {
        response: "I had trouble accessing your top songs.",
        shouldPlay: true
      };
    }
  }

  // Music playing functionality
  if (lowerMessage.includes('play') && (lowerMessage.includes('music') || lowerMessage.includes('song'))) {
    const isConnected = await spotifyService.isConnected();
    if (!isConnected) {
      return {
        response: "I'd love to play music for you, but you need to connect your Spotify account first. You can do this in the settings.",
        shouldPlay: true
      };
    }

    // Check if user can use Spotify feature
    const canUse = await subscriptionService.canUseFeature(userId, 'spotify');
    if (!canUse) {
      return {
        response: "You've reached your Spotify plays limit for this month. Please upgrade your plan to continue using Spotify features.",
        shouldPlay: true
      };
    }

    // Extract song name from message
    const playMatch = message.match(/play\s+(.+?)(?:\s+(?:on\s+)?spotify)?$/i);
    if (playMatch) {
      const songQuery = playMatch[1].trim();
      
      try {
        const track = await spotifyService.searchTrack(songQuery);
        if (!track) {
          return {
            response: `I couldn't find "${songQuery}" on Spotify. Could you try a different search?`,
            shouldPlay: true
          };
        }

        const playResult = await spotifyService.playTrack(track.uri);
        
        if (playResult.success) {
          // Increment usage on successful play
          await subscriptionService.incrementUsage(userId, 'spotify');
          return {
            response: `Now playing "${track.name}" by ${track.artist} on Spotify.`,
            action: 'spotify_play',
            data: { track },
            shouldPlay: true
          };
        } else {
          if (playResult.error === 'premium_required') {
            return {
              response: "To play music on Spotify, you need a Spotify Premium subscription. You can upgrade your Spotify account at spotify.com.",
              shouldPlay: true
            };
          } else if (playResult.error === 'no_devices' || playResult.error === 'no_active_device') {
            return {
              response: "I couldn't find an active Spotify device. Please open Spotify on your phone, computer, or any device, then try again.",
              shouldPlay: true
            };
          } else {
            return {
              response: `I had trouble playing that song. ${playResult.error || 'Please try again.'}`,
              shouldPlay: true
            };
          }
        }
      } catch (error) {
        return {
          response: "I had trouble playing that song. Could you try again?",
          shouldPlay: true
        };
      }
    }

    return {
      response: "What song would you like me to play on Spotify?",
      shouldPlay: true
    };
  }

  if (lowerMessage.includes('time')) {
    const currentTime = getCurrentTime();
    return { response: `The current time is ${currentTime}`, shouldPlay: true };
  }

  if (lowerMessage.includes('weather')) {
    try {
      const weatherData = await fetchWeather();
      if (weatherData) {
        return { response: weatherData, shouldPlay: true };
      } else {
        return { response: "I couldn't fetch the weather right now.", shouldPlay: true };
      }
    } catch (error) {
      console.error("Error fetching weather:", error);
      return { response: "I encountered an error while fetching the weather.", shouldPlay: true };
    }
  }

  return null;
}
