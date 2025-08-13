
import { getAnswer } from './llmService';
import { LocationData } from '@/types/location';
import { spotifyService } from './spotifyService';
import { subscriptionService } from './subscriptionService';

export async function processConversation(
  message: string,
  userId: string,
  locationData?: LocationData
): Promise<{ response: string; action?: string; data?: any; shouldPlay?: boolean }> {
  console.log('Processing conversation with simplified router...');

  try {
    // First check for quick actions with Spotify data
    const quickAction = await handleQuickActions(message, userId, locationData);
    if (quickAction) {
      return quickAction;
    }

    // If no quick actions are triggered, process with the LLM
    const answer = await getAnswer(message, userId, locationData);
    return {
      response: answer,
      shouldPlay: true
    };

  } catch (error) {
    console.error('Error in processConversation:', error);
    return {
      response: "I'm having some technical difficulties right now. Could you try again?",
      shouldPlay: true
    };
  }
}

async function handleQuickActions(
  message: string, 
  userId: string, 
  locationData?: LocationData
): Promise<{ 
  response: string; 
  action?: string; 
  data?: any;
  shouldPlay?: boolean;
} | null> {
  const lowerMessage = message.toLowerCase();

  // Spotify profile information
  if (lowerMessage.includes('spotify') && (
    lowerMessage.includes('name') || 
    lowerMessage.includes('profile') ||
    lowerMessage.includes('who am i')
  )) {
    try {
      const profile = await spotifyService.getStoredUserProfile();
      if (profile) {
        return {
          response: `Your Spotify name is ${profile.display_name}. You have a ${profile.product} account.`,
          shouldPlay: true
        };
      }
    } catch (error) {
      console.error('Error getting Spotify profile:', error);
    }
  }

  // Music playing
  if (lowerMessage.includes('play') && lowerMessage.includes('music')) {
    const isConnected = await spotifyService.isConnected();
    if (!isConnected) {
      return {
        response: "Please connect your Spotify account first to play music.",
        shouldPlay: true
      };
    }

    const canUse = await subscriptionService.canUseFeature(userId, 'spotify');
    if (!canUse) {
      return {
        response: "You've reached your Spotify plays limit. Please upgrade your plan.",
        shouldPlay: true
      };
    }

    return {
      response: "What song would you like me to play?",
      shouldPlay: true
    };
  }

  // Time
  if (lowerMessage.includes('time')) {
    const now = new Date();
    const timeString = now.toLocaleTimeString();
    return { response: `The time is ${timeString}`, shouldPlay: true };
  }

  // Weather (requires location data)
  if (lowerMessage.includes('weather')) {
    if (locationData && locationData.city) {
      return { response: `The weather in ${locationData.city} is sunny.`, shouldPlay: true };
    } else {
      return { response: "I need your location to tell you the weather.", shouldPlay: true };
    }
  }

  return null;
}
