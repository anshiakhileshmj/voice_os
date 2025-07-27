
import React from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

const Landing = () => {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/auth');
  };

  return (
    <LandingContainer>
      <ContentWrapper>
        <AnimatedTitle>Automate your Computer</AnimatedTitle>
        <AnimatedSubtitle>Your Computer. Just Smarter.</AnimatedSubtitle>
        <GetStartedButton onClick={handleGetStarted}>
          <span>Get Started</span>
        </GetStartedButton>
      </ContentWrapper>
    </LandingContainer>
  );
};

const LandingContainer = styled.div`
  @import url('https://fonts.googleapis.com/css?family=Caveat|Righteous&display=swap');
  
  background: black;
  width: 100%;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
`;

const ContentWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2rem;
`;

const AnimatedTitle = styled.h1`
  font-family: 'Righteous', cursive;
  background: url('https://media.giphy.com/media/FE0WTM8BG754I/giphy.gif') center center no-repeat;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  font-size: 4.5rem;
  letter-spacing: 10px;
  background-size: cover;
  margin: 0px;
  color: transparent;
`;

const AnimatedSubtitle = styled.p`
  font-family: 'Caveat', cursive;
  color: transparent;
  font-size: 2rem;
  letter-spacing: 5px;
  margin: 0px;
  background: linear-gradient(to right, #c4c4c4, #6a6a6a);
  -webkit-background-clip: text;
`;

const GetStartedButton = styled.div`
  /* Container to enable 3D perspective */
  perspective: 1000px;
  
  /* Base button styles with capsule shape and glass effect */
  width: 200px;
  height: 60px;
  border-radius: 30px;
  background: linear-gradient(
    to bottom,
    rgba(255, 255, 255, 0.15),
    rgba(255, 255, 255, 0.05)
  );
  box-shadow:
    inset 0 1px 2px rgba(255, 255, 255, 0.4),
    inset 0 -1px 2px rgba(0, 0, 0, 0.2),
    0 4px 8px rgba(0, 0, 0, 0.2),
    0 0 20px rgba(255, 255, 255, 0.1);
  transform: rotateX(15deg) translateZ(0);
  transition: all 0.3s cubic-bezier(0.68, -0.55, 0.27, 1.55);
  position: relative;
  cursor: pointer;
  animation: pulse 2s infinite ease-in-out;
  overflow: hidden;

  /* Moving shine effect for glass-like reflection */
  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: -50px;
    width: 50px;
    height: 100%;
    background: linear-gradient(
      to right,
      transparent,
      rgba(255, 255, 255, 0.1),
      rgba(255, 255, 255, 0.2),
      rgba(255, 255, 255, 0.1),
      transparent
    );
    transform: skewX(-25deg);
    animation: shine 3s infinite linear;
    pointer-events: none;
    z-index: 1;
  }

  /* Ground shadow to enhance 3D effect */
  &::after {
    content: "";
    position: absolute;
    bottom: -10px;
    left: 10%;
    width: 80%;
    height: 10px;
    background: radial-gradient(
      ellipse at center,
      rgba(0, 0, 0, 0.3) 0%,
      transparent 70%
    );
    z-index: -1;
  }

  /* Text inside the button */
  span {
    position: relative;
    z-index: 2;
    color: white;
    font-size: 18px;
    font-family: Arial, sans-serif;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
    display: block;
    line-height: 60px;
    text-align: center;
  }

  /* Hover state: Straighten, lift, and enhance glow */
  &:hover {
    transform: rotateX(0deg) translateZ(15px) scale(1.05);
    box-shadow:
      inset 0 1px 2px rgba(255, 255, 255, 0.4),
      inset 0 -1px 2px rgba(0, 0, 0, 0.2),
      0 8px 16px rgba(0, 0, 0, 0.3),
      0 0 40px rgba(255, 255, 255, 0.25);
  }

  /* Active state: Depress and dim glow */
  &:active {
    transform: rotateX(0deg) translateZ(-5px) scale(0.95);
    box-shadow:
      inset 0 1px 2px rgba(255, 255, 255, 0.4),
      inset 0 -1px 2px rgba(0, 0, 0, 0.2),
      0 2px 4px rgba(0, 0, 0, 0.2),
      0 0 10px rgba(255, 255, 255, 0.1);
  }

  /* Pulsing animation for idle state */
  @keyframes pulse {
    0%, 100% {
      box-shadow:
        inset 0 1px 2px rgba(255, 255, 255, 0.4),
        inset 0 -1px 2px rgba(0, 0, 0, 0.2),
        0 4px 8px rgba(0, 0, 0, 0.2),
        0 0 20px rgba(255, 255, 255, 0.1);
    }
    50% {
      box-shadow:
        inset 0 1px 2px rgba(255, 255, 255, 0.4),
        inset 0 -1px 2px rgba(0, 0, 0, 0.2),
        0 4px 8px rgba(0, 0, 0, 0.2),
        0 0 30px rgba(255, 255, 255, 0.2);
    }
  }

  /* Shine animation for dynamic glass effect */
  @keyframes shine {
    0% {
      left: -50px;
    }
    100% {
      left: 250px;
    }
  }
`;

export default Landing;
