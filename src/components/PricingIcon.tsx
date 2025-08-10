
import React from 'react';
import { useNavigate } from 'react-router-dom';

const PricingIcon: React.FC = () => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate('/pricing');
  };

  return (
    <button
      onClick={handleClick}
      className="fixed top-4 right-4 z-50 w-12 h-12 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
      title="Pricing Plans"
    >
      P
    </button>
  );
};

export default PricingIcon;
