import React from 'react';
import styled from 'styled-components';

interface AnimatedCallButtonProps {
  label: string;
  onClick: () => void;
}

const AnimatedCallButton: React.FC<AnimatedCallButtonProps> = ({ label, onClick }) => {
  return (
    <StyledWrapper>
      <div className="loader-wrapper">
        <button className="loader-letter" onClick={onClick}>{label}</button>
        <div className="loader" />
      </div>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  .loader-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 270px;
    height: 270px;
    font-family: "Inter", sans-serif;
    font-size: 1.8em;
    font-weight: 300;
    color: white;
    border-radius: 50%;
    background-color: transparent;
    user-select: none;
  }

  .loader {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    aspect-ratio: 1 / 1;
    border-radius: 50%;
    background-color: transparent;
    animation: loader-rotate 2s linear infinite;
    z-index: 0;
  }

  @keyframes loader-rotate {
    0% {
      transform: rotate(90deg);
      box-shadow:
        0 10px 20px 0 #fff inset,
        0 20px 30px 0 #ad5fff inset,
        0 60px 60px 0 #471eec inset;
    }
    50% {
      transform: rotate(270deg);
      box-shadow:
        0 10px 20px 0 #fff inset,
        0 20px 10px 0 #d60a47 inset,
        0 40px 60px 0 #311e80 inset;
    }
    100% {
      transform: rotate(450deg);
      box-shadow:
        0 10px 20px 0 #fff inset,
        0 20px 30px 0 #ad5fff inset,
        0 60px 60px 0 #471eec inset;
    }
  }

  .loader-letter {
    display: inline-block;
    opacity: 0.4;
    transform: translateY(0);
    animation: loader-letter-anim 2s infinite;
    z-index: 1;
    border-radius: 50px;
    background-color: transparent;
    border: 2px solid white;
    padding: 0.6em 1.5em;
    font-size: 0.8em;
    cursor: pointer;
    transition:
      background 0.3s,
      color 0.3s,
      opacity 0.3s;
    color: white;
  }

  .loader-letter:hover {
    background-color: white;
    color: #111;
    opacity: 1;
  }

  @keyframes loader-letter-anim {
    0%,
    100% {
      opacity: 0.4;
      transform: translateY(0);
    }
    20% {
      opacity: 1;
      transform: scale(1.15);
    }
    40% {
      opacity: 0.7;
      transform: translateY(0);
    }
  }
`;

export default AnimatedCallButton; 