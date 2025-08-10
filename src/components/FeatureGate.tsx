
import React, { ReactNode } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface FeatureGateProps {
  feature: 'voice' | 'automation' | 'document' | 'spotify';
  children: ReactNode;
  fallback?: ReactNode;
}

const FeatureGate: React.FC<FeatureGateProps> = ({ feature, children, fallback }) => {
  const { isFeatureAvailable, canUseFeature, incrementUsage } = useSubscription();
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
      toast({
        title: "Usage Limit Reached",
        description: "You've reached your monthly limit for this feature. Upgrade your plan to continue.",
        variant: "destructive"
      });
      navigate('/pricing');
      return;
    }

    // If it's a usage-based feature, increment the counter
    if (feature !== 'spotify') {
      await incrementUsage(feature);
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
