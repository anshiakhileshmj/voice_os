
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { subscriptionService, SUBSCRIPTION_PLANS, SubscriptionStatus } from '@/services/subscriptionService';
import PricingCard from '@/components/PricingCard';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const Pricing: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
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

    // Redirect to Razorpay payment pages
    if (planId === 'starter') {
      window.open('https://rzp.io/rzp/RVUlNQzf', '_blank');
    } else if (planId === 'pro') {
      window.open('https://rzp.io/rzp/KMP5NAhX', '_blank');
    }
  };

  const handleBackToApp = () => {
    navigate('/app');
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
        {/* Back Button */}
        <button
          onClick={handleBackToApp}
          className="mb-8 flex items-center gap-2 text-gray-300 hover:text-white transition-colors duration-300"
        >
          <ArrowLeft size={20} />
          
        </button>

        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Unlock the full potential of MJAK AI assistant with our flexible pricing plans
          </p>
        </div>

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
      </div>
    </div>
  );
};

export default Pricing;
