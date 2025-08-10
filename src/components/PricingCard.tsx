
import React from 'react';
import styled from 'styled-components';
import { SubscriptionPlan } from '@/services/subscriptionService';

interface PricingCardProps {
  plan: SubscriptionPlan;
  onSelectPlan: (planId: 'free' | 'starter' | 'pro') => void;
  isCurrentPlan?: boolean;
}

const PricingCard: React.FC<PricingCardProps> = ({ plan, onSelectPlan, isCurrentPlan }) => {
  const features = [
    {
      name: 'Voice Interactions',
      value: plan.features.voiceInteractions === 'unlimited' ? 'Unlimited' : `${plan.features.voiceInteractions}/month`,
      included: plan.features.voiceInteractions > 0 || plan.features.voiceInteractions === 'unlimited'
    },
    {
      name: 'Automations',
      value: plan.features.automations === 'unlimited' ? 'Unlimited' : `${plan.features.automations}/month`,
      included: plan.features.automations > 0 || plan.features.automations === 'unlimited'
    },
    {
      name: 'Document Processing',
      value: plan.features.documentsProcessed === 'unlimited' ? 'Unlimited' : 
             plan.features.documentsProcessed === 0 ? 'Not included' : `${plan.features.documentsProcessed}/month`,
      included: plan.features.documentsProcessed > 0 || plan.features.documentsProcessed === 'unlimited'
    },
    {
      name: 'Spotify Integration',
      value: 'Music control & playback',
      included: plan.features.spotifyIntegration
    },
    {
      name: 'Context Memory',
      value: 'AI remembers conversations',
      included: plan.features.contextMemory
    },
    {
      name: 'Email Support',
      value: '24/7 customer support',
      included: plan.features.emailSupport
    }
  ];

  const handleSelectPlan = () => {
    if (!isCurrentPlan) {
      onSelectPlan(plan.id);
    }
  };

  return (
    <StyledWrapper>
      <div className={`card ${plan.id === 'starter' ? 'popular' : ''}`}>
        {plan.id === 'starter' && <div className="popular-badge">Popular</div>}
        <div className="plan-header">
          <h3 className="plan-name">{plan.name}</h3>
          <p className="price">
            ${plan.price}
            {plan.price > 0 && <span className="period">/month</span>}
          </p>
        </div>
        <ul className="lists">
          {features.map((feature, index) => (
            <li key={index} className="list">
              {feature.included ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="check-icon">
                  <g strokeWidth={0} id="SVGRepo_bgCarrier" />
                  <g strokeLinejoin="round" strokeLinecap="round" id="SVGRepo_tracerCarrier" />
                  <g id="SVGRepo_iconCarrier">
                    <path fill="#10b981" d="M21.5821 5.54289C21.9726 5.93342 21.9726 6.56658 21.5821 6.95711L10.2526 18.2867C9.86452 18.6747 9.23627 18.6775 8.84475 18.293L2.29929 11.8644C1.90527 11.4774 1.89956 10.8443 2.28655 10.4503C2.67354 10.0562 3.30668 10.0505 3.70071 10.4375L9.53911 16.1717L20.1679 5.54289C20.5584 5.15237 21.1916 5.15237 21.5821 5.54289Z" clipRule="evenodd" fillRule="evenodd" />
                  </g>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="cross-icon">
                  <g strokeWidth={0} id="SVGRepo_bgCarrier" />
                  <g strokeLinejoin="round" strokeLinecap="round" id="SVGRepo_tracerCarrier" />
                  <g id="SVGRepo_iconCarrier">
                    <path fill="#ef4444" d="M18.3 5.71a.996.996 0 0 0-1.41 0L12 10.59 7.11 5.7A.996.996 0 1 0 5.7 7.11L10.59 12 5.7 16.89a.996.996 0 1 0 1.41 1.41L12 13.41l4.89 4.89a.996.996 0 0 0 1.41-1.41L13.41 12l4.89-4.89c.38-.38.38-1.02 0-1.4z" />
                  </g>
                </svg>
              )}
              <span className={feature.included ? 'included' : 'not-included'}>
                {feature.name}: {feature.value}
              </span>
            </li>
          ))}
        </ul>
        <button 
          className={`action ${isCurrentPlan ? 'current' : ''}`}
          onClick={handleSelectPlan}
          disabled={isCurrentPlan}
        >
          {isCurrentPlan ? 'Current Plan' : plan.price === 0 ? 'Get Started' : 'Upgrade Now'}
        </button>
      </div>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  .card {
    max-width: 320px;
    display: flex;
    flex-direction: column;
    border-radius: 1.5rem;
    background-color: rgba(0, 0, 0, 1);
    padding: 1.5rem;
    box-shadow: 0px 0px 25px rgba(0, 0, 0, 0.3);
    border: 2px solid transparent;
    position: relative;
    transition: all 0.3s ease;
  }

  .card.popular {
    border-color: #10b981;
    transform: scale(1.05);
  }

  .popular-badge {
    position: absolute;
    top: -10px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, #10b981, #059669);
    color: white;
    padding: 4px 16px;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.5px;
  }

  .plan-header {
    text-align: center;
    margin-bottom: 1.5rem;
  }

  .plan-name {
    font-size: 1.5rem;
    font-weight: 700;
    color: rgba(255, 255, 255, 1);
    margin-bottom: 0.5rem;
  }

  .price {
    font-size: 3rem;
    line-height: 1;
    font-weight: 600;
    color: rgba(255, 255, 255, 1);
    margin: 0;
  }

  .period {
    font-size: 1rem;
    color: rgba(255, 255, 255, 0.7);
    font-weight: 400;
  }

  .lists {
    margin-top: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    font-size: 0.875rem;
    line-height: 1.25rem;
    color: rgba(255, 255, 255, 1);
  }

  .list {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .check-icon, .cross-icon {
    height: 1rem;
    width: 1rem;
    flex-shrink: 0;
    margin-top: 2px;
  }

  .list span.included {
    color: rgba(255, 255, 255, 1);
  }

  .list span.not-included {
    color: rgba(255, 255, 255, 0.5);
  }

  .action {
    margin-top: 2rem;
    width: 100%;
    border: 2px solid rgba(255, 255, 255, 1);
    border-radius: 9999px;
    background-color: rgba(255, 255, 255, 1);
    padding: 0.75rem 1.5rem;
    font-weight: 600;
    text-align: center;
    font-size: 0.875rem;
    color: rgba(0, 0, 0, 1);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .action:hover:not(:disabled) {
    color: rgba(255, 255, 255, 1);
    background-color: transparent;
  }

  .action.current {
    background-color: rgba(34, 197, 94, 1);
    border-color: rgba(34, 197, 94, 1);
    color: rgba(255, 255, 255, 1);
    cursor: not-allowed;
  }

  .action:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

export default PricingCard;
