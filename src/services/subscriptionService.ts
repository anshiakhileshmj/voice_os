
import { supabase } from '@/integrations/supabase/client';

export interface SubscriptionPlan {
  id: 'free' | 'starter' | 'pro';
  name: string;
  price: number;
  currency: string;
  features: {
    voiceInteractions: number | 'unlimited';
    automations: number | 'unlimited';
    documentsProcessed: number | 'unlimited';
    spotifyIntegration: boolean;
    spotifyPlays: number | 'unlimited';
    contextMemory: boolean;
    emailSupport: boolean;
  };
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    currency: 'USD',
    features: {
      voiceInteractions: 50,
      automations: 5,
      documentsProcessed: 2,
      spotifyIntegration: true,
      spotifyPlays: 3,
      contextMemory: true,
      emailSupport: true,
    },
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 12.99,
    currency: 'USD',
    features: {
      voiceInteractions: 300,
      automations: 50,
      documentsProcessed: 10,
      spotifyIntegration: true,
      spotifyPlays: 200,
      contextMemory: true,
      emailSupport: true,
    },
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 23.99,
    currency: 'USD',
    features: {
      voiceInteractions: 'unlimited',
      automations: 'unlimited',
      documentsProcessed: 'unlimited',
      spotifyIntegration: true,
      spotifyPlays: 'unlimited',
      contextMemory: true,
      emailSupport: true,
    },
  },
];

export interface UserUsage {
  voiceInteractions: number;
  automationsUsed: number;
  documentsProcessed: number;
  spotifyPlays: number;
}

export interface SubscriptionStatus {
  tier: 'free' | 'starter' | 'pro';
  subscribed: boolean;
  subscriptionEnd?: string;
}

export class SubscriptionService {
  async getUserSubscription(userId: string): Promise<SubscriptionStatus | null> {
    try {
      const { data, error } = await supabase
        .from('subscribers')
        .select('subscribed, subscription_tier, subscription_end')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (!data) {
        // Create default free subscription for new users
        await this.createFreeSubscription(userId);
        return {
          tier: 'free',
          subscribed: false,
          subscriptionEnd: undefined,
        };
      }

      return {
        tier: data.subscription_tier as 'free' | 'starter' | 'pro',
        subscribed: data.subscribed,
        subscriptionEnd: data.subscription_end,
      };
    } catch (error) {
      console.error('Error getting user subscription:', error);
      return null;
    }
  }

  async createFreeSubscription(userId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      await supabase
        .from('subscribers')
        .insert({
          user_id: userId,
          email: user.email!,
          subscription_tier: 'free',
          subscribed: false,
        });
    } catch (error) {
      console.error('Error creating free subscription:', error);
    }
  }

  async getCurrentUsage(userId: string): Promise<UserUsage> {
    try {
      const { data, error } = await supabase.rpc('get_current_month_usage', {
        p_user_id: userId,
      });

      if (error) throw error;

      const usage = data[0];
      if (!usage) {
        return {
          voiceInteractions: 0,
          automationsUsed: 0,
          documentsProcessed: 0,
          spotifyPlays: 0,
        };
      }

      return {
        voiceInteractions: usage.voice_interactions || 0,
        automationsUsed: usage.automations_used || 0,
        documentsProcessed: usage.documents_processed || 0,
        spotifyPlays: usage.spotify_plays || 0,
      };
    } catch (error) {
      console.error('Error getting current usage:', error);
      return {
        voiceInteractions: 0,
        automationsUsed: 0,
        documentsProcessed: 0,
        spotifyPlays: 0,
      };
    }
  }

  async incrementUsage(
    userId: string,
    type: 'voice' | 'automation' | 'document' | 'spotify'
  ): Promise<boolean> {
    try {
      // Check if user can use the feature before incrementing
      const canUse = await this.canUseFeature(userId, type);
      if (!canUse) {
        return false;
      }

      const voiceIncrement = type === 'voice' ? 1 : 0;
      const automationIncrement = type === 'automation' ? 1 : 0;
      const documentIncrement = type === 'document' ? 1 : 0;
      const spotifyIncrement = type === 'spotify' ? 1 : 0;

      const { data, error } = await supabase.rpc('increment_usage', {
        p_user_id: userId,
        p_voice_interactions: voiceIncrement,
        p_automations: automationIncrement,
        p_documents: documentIncrement,
        p_spotify_plays: spotifyIncrement,
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error incrementing usage:', error);
      return false;
    }
  }

  async canUseFeature(
    userId: string,
    featureType: 'voice' | 'automation' | 'document' | 'spotify'
  ): Promise<boolean> {
    try {
      const [subscription, usage] = await Promise.all([
        this.getUserSubscription(userId),
        this.getCurrentUsage(userId),
      ]);

      if (!subscription) return false;

      const plan = SUBSCRIPTION_PLANS.find(p => p.id === subscription.tier);
      if (!plan) return false;

      switch (featureType) {
        case 'spotify':
          if (!plan.features.spotifyIntegration) return false;
          return plan.features.spotifyPlays === 'unlimited' || 
                 (typeof plan.features.spotifyPlays === 'number' && usage.spotifyPlays < plan.features.spotifyPlays);
        case 'voice':
          return plan.features.voiceInteractions === 'unlimited' || 
                 (typeof plan.features.voiceInteractions === 'number' && usage.voiceInteractions < plan.features.voiceInteractions);
        case 'automation':
          return plan.features.automations === 'unlimited' || 
                 (typeof plan.features.automations === 'number' && usage.automationsUsed < plan.features.automations);
        case 'document':
          return plan.features.documentsProcessed === 'unlimited' || 
                 (typeof plan.features.documentsProcessed === 'number' && usage.documentsProcessed < plan.features.documentsProcessed);
        default:
          return false;
      }
    } catch (error) {
      console.error('Error checking feature availability:', error);
      return false;
    }
  }

  getPlan(tier: 'free' | 'starter' | 'pro'): SubscriptionPlan | undefined {
    return SUBSCRIPTION_PLANS.find(p => p.id === tier);
  }

  isFeatureAvailable(featureType: 'voice' | 'automation' | 'document' | 'spotify', tier: 'free' | 'starter' | 'pro'): boolean {
    const plan = SUBSCRIPTION_PLANS.find(p => p.id === tier);
    if (!plan) return false;

    switch (featureType) {
      case 'spotify':
        return plan.features.spotifyIntegration;
      case 'voice':
        return plan.features.voiceInteractions === 'unlimited' || (typeof plan.features.voiceInteractions === 'number' && plan.features.voiceInteractions > 0);
      case 'automation':
        return plan.features.automations === 'unlimited' || (typeof plan.features.automations === 'number' && plan.features.automations > 0);
      case 'document':
        return plan.features.documentsProcessed === 'unlimited' || (typeof plan.features.documentsProcessed === 'number' && plan.features.documentsProcessed > 0);
      default:
        return false;
    }
  }

  async updateSubscription(
    userId: string,
    tier: 'starter' | 'pro',
    paymentId: string
  ): Promise<boolean> {
    try {
      const subscriptionEnd = new Date();
      subscriptionEnd.setMonth(subscriptionEnd.getMonth() + 1);

      const { error } = await supabase
        .from('subscribers')
        .update({
          subscription_tier: tier,
          subscribed: true,
          subscription_end: subscriptionEnd.toISOString(),
        })
        .eq('user_id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating subscription:', error);
      return false;
    }
  }
}

export const subscriptionService = new SubscriptionService();
