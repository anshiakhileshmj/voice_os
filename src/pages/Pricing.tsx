
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { subscriptionService, SUBSCRIPTION_PLANS, SubscriptionStatus } from '@/services/subscriptionService';
import PricingCard from '@/components/PricingCard';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

declare global {
  interface Window {
    Razorpay: any;
  }
}

const Pricing: React.FC = () => {
  const { user } = useAuth();
  const [currentSubscription, setCurrentSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadSubscriptionData();
    }
  }, [user]);

  const loadSubscriptionData = async () => {
    if (!user) return;
    
    try {
      const subscription = await subscriptionService.getUserSubscription(user.id);
      setCurrentSubscription(subscription);
    } catch (error) {
      console.error('Error loading subscription data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = async (planId: 'free' | 'starter' | 'pro') => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to select a plan.",
        variant: "destructive"
      });
      return;
    }

    if (planId === 'free') {
      toast({
        title: "Free Plan Active",
        description: "You're already on the free plan!",
      });
      return;
    }

    const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId);
    if (!plan) return;

    // Initialize Razorpay payment
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => {
      const options = {
        key: 'YOUR_RAZORPAY_KEY_ID', // Replace with your Razorpay key
        amount: plan.price * 100, // Amount in paise
        currency: 'USD',
        name: 'MJAK AI Assistant',
        description: `${plan.name} Plan Subscription`,
        handler: async (response: any) => {
          try {
            const success = await subscriptionService.updateSubscription(
              user.id,
              planId,
              response.razorpay_payment_id
            );

            if (success) {
              toast({
                title: "Subscription Activated",
                description: `Welcome to ${plan.name} plan! All features are now available.`,
              });
              loadSubscriptionData();
            } else {
              throw new Error('Failed to activate subscription');
            }
          } catch (error) {
            toast({
              title: "Subscription Failed",
              description: "There was an error activating your subscription. Please contact support.",
              variant: "destructive"
            });
          }
        },
        prefill: {
          email: user.email,
        },
        theme: {
          color: '#10b981',
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    };

    document.head.appendChild(script);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Unlock the full potential of your AI assistant with our flexible pricing plans
          </p>
        </div>

        {currentSubscription && (
          <Card className="max-w-md mx-auto mb-8 bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white text-center">Current Plan</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-green-400 font-semibold text-lg capitalize">
                {currentSubscription.tier} Plan
              </p>
              {currentSubscription.subscriptionEnd && (
                <p className="text-gray-400 text-sm mt-2">
                  Renews on: {new Date(currentSubscription.subscriptionEnd).toLocaleDateString()}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 justify-items-center max-w-6xl mx-auto">
          {SUBSCRIPTION_PLANS.map((plan) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              onSelectPlan={handleSelectPlan}
              isCurrentPlan={currentSubscription?.tier === plan.id}
            />
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-gray-400 text-sm max-w-2xl mx-auto">
            All plans include premium TTS voice quality, context memory, and email support. 
            Cancel anytime. No hidden fees.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
