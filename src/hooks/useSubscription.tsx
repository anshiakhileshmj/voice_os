
import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { subscriptionService, SubscriptionStatus, UserUsage } from '@/services/subscriptionService';
import { toast } from '@/hooks/use-toast';

export const useSubscription = () => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [usage, setUsage] = useState<UserUsage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadSubscriptionData();
    }
  }, [user]);

  const loadSubscriptionData = async () => {
    if (!user) return;

    try {
      const [subscriptionData, usageData] = await Promise.all([
        subscriptionService.getUserSubscription(user.id),
        subscriptionService.getCurrentUsage(user.id)
      ]);

      setSubscription(subscriptionData);
      setUsage(usageData);
    } catch (error) {
      console.error('Error loading subscription data:', error);
    } finally {
      setLoading(false);
    }
  };

  const canUseFeature = async (featureType: 'voice' | 'automation' | 'document' | 'spotify'): Promise<boolean> => {
    if (!user) return false;
    return await subscriptionService.canUseFeature(user.id, featureType);
  };

  const incrementUsage = async (type: 'voice' | 'automation' | 'document'): Promise<boolean> => {
    if (!user) return false;

    // Check if user can use the feature before incrementing
    const canUse = await canUseFeature(type);
    if (!canUse) {
      const featureNames = {
        voice: 'voice interactions',
        automation: 'automations',
        document: 'document processing'
      };

      toast({
        title: "Usage Limit Reached",
        description: `You've reached your monthly limit for ${featureNames[type]}. Upgrade your plan to continue.`,
        variant: "destructive"
      });
      return false;
    }

    const success = await subscriptionService.incrementUsage(user.id, type);
    if (success) {
      // Reload usage data
      loadSubscriptionData();
    }
    return success;
  };

  const getPlan = () => {
    if (!subscription) return null;
    return subscriptionService.getPlan(subscription.tier);
  };

  const getRemainingUsage = () => {
    if (!subscription || !usage) return null;

    const plan = getPlan();
    if (!plan) return null;

    return {
      voice: plan.features.voiceInteractions === 'unlimited' 
        ? 'unlimited' 
        : Math.max(0, (typeof plan.features.voiceInteractions === 'number' ? plan.features.voiceInteractions : 0) - usage.voiceInteractions),
      automation: plan.features.automations === 'unlimited'
        ? 'unlimited'
        : Math.max(0, (typeof plan.features.automations === 'number' ? plan.features.automations : 0) - usage.automationsUsed),
      document: plan.features.documentsProcessed === 'unlimited'
        ? 'unlimited'
        : Math.max(0, (typeof plan.features.documentsProcessed === 'number' ? plan.features.documentsProcessed : 0) - usage.documentsProcessed),
    };
  };

  const isFeatureAvailable = (featureType: 'voice' | 'automation' | 'document' | 'spotify'): boolean => {
    if (!subscription) return false;
    
    const plan = getPlan();
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
  };

  return {
    subscription,
    usage,
    loading,
    canUseFeature,
    incrementUsage,
    getPlan,
    getRemainingUsage,
    isFeatureAvailable,
    refreshData: loadSubscriptionData,
  };
};
