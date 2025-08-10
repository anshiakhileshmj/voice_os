
import React, { ReactNode } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface FeatureGateProps {
  feature: 'voice' | 'automation' | 'document' | 'spotify';
  children: ReactNode;
  fallback?: ReactNode;
  onLimitReached?: () => void;
}

const FeatureGate: React.FC<FeatureGateProps> = ({ 
  feature, 
  children, 
  fallback, 
  onLimitReached 
}) => {
  const { isFeatureAvailable, canUseFeature, incrementUsage, subscription } = useSubscription();
  const navigate = useNavigate();

  const handleFeatureClick = async () => {
    const available = isFeatureAvailable(feature);
    
    if (!available) {
      toast({
        title: "Feature Not Available",
        description: "This feature is not included in your current plan. Upgrade to access it.",
        variant: "destructive"
      });
      navigate('/pricing');
      return;
    }

    const canUse = await canUseFeature(feature);
    if (!canUse) {
      const planName = subscription?.tier || 'current';
      toast({
        title: "Usage Limit Reached",
        description: `You've reached your monthly limit for this feature on the ${planName} plan. Upgrade to continue.`,
        variant: "destructive"
      });
      
      if (onLimitReached) {
        onLimitReached();
      }
      
      navigate('/pricing');
      return;
    }

    // If it's a usage-based feature, increment the counter
    if (feature !== 'spotify') {
      const success = await incrementUsage(feature);
      if (!success) {
        // Usage increment failed, likely due to limit reached
        navigate('/pricing');
        return;
      }
    }
  };

  if (!isFeatureAvailable(feature)) {
    return fallback ? <>{fallback}</> : null;
  }

  return (
    <div onClick={handleFeatureClick}>
      {children}
    </div>
  );
};

export default FeatureGate;
