import React from 'react';
import styled from 'styled-components';

interface AutomatePowerSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const AutomatePowerSwitch: React.FC<AutomatePowerSwitchProps> = ({ checked, onChange }) => {
  return (
    <StyledWrapper>
      <div className="power-switch">
        <input type="checkbox" id="power-toggle" checked={checked} onChange={e => onChange(e.target.checked)} />
        <div className="button">
          <svg className="power-off" viewBox="0 0 150 150">
            <line x1={75} y1={34} x2={75} y2={58} className="line" />
            <circle cx={75} cy={80} r={35} className="circle" />
          </svg>
          <svg className="power-on" viewBox="0 0 150 150">
            <line x1={75} y1={34} x2={75} y2={58} className="line" />
            <circle cx={75} cy={80} r={35} className="circle" />
          </svg>
        </div>
      </div>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  .power-switch {
    --color-invert: #ffffff;
    --width: 50px;
    --height: 50px;
    position: relative;
    width: var(--width);
    height: var(--height);
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .button {
    width: 100%;
    height: 100%;
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .button::after {
    content: "";
    position: absolute;
    width: 100%;
    height: 100%;
    background: radial-gradient(circle closest-side, var(--color-invert), transparent);
    filter: blur(20px);
    opacity: 0;
    transition: opacity 1s ease, transform 1s ease;
    transform: perspective(1px) translateZ(0);
    backface-visibility: hidden;
  }

  .power-on,
  .power-off {
    width: 100%;
    height: 100%;
    position: absolute;
    z-index: 1;
    fill: none;
    stroke: var(--color-invert);
    stroke-width: 8px;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .power-on .line,
  .power-off .line {
    opacity: 0.2;
  }

  .power-on .circle,
  .power-off .circle {
    opacity: 0.2;
    transform: rotate(-58deg);
    transform-origin: center 80px;
    stroke-dasharray: 220;
    stroke-dashoffset: 40;
  }

  .power-on {
    filter: drop-shadow(0px 0px 6px rgba(255, 255, 255, 0.8));
  }

  .power-on .line {
    opacity: 0;
    transition: opacity 0.3s ease 1s;
  }

  .power-on .circle {
    opacity: 1;
    stroke-dashoffset: 220;
    transition: transform 0s ease, stroke-dashoffset 1s ease 0s;
  }

  /* Hidden input for toggle */
  input[type="checkbox"] {
    position: absolute;
    width: 100%;
    height: 100%;
    z-index: 2;
    cursor: pointer;
    opacity: 0;
  }

  input[type="checkbox"]:checked + .button::after {
    opacity: 0.15;
    transform: scale(2) perspective(1px) translateZ(0);
    backface-visibility: hidden;
    transition: opacity 0.5s ease, transform 0.5s ease;
  }

  input[type="checkbox"]:checked + .button .power-on,
  input[type="checkbox"]:checked + .button .power-off {
    animation: click-animation 0.3s ease forwards;
    transform: scale(1);
  }

  input[type="checkbox"]:checked + .button .power-on .line,
  input[type="checkbox"]:checked + .button .power-off .line {
    animation: line-animation 0.8s ease-in forwards;
  }

  input[type="checkbox"]:checked + .button .power-on .line {
    opacity: 1;
    transition: opacity 0.05s ease-in 0.55s;
  }

  input[type="checkbox"]:checked + .button .power-on .circle {
    transform: rotate(302deg);
    stroke-dashoffset: 40;
    transition: transform 0.4s ease 0.2s, stroke-dashoffset 0.4s ease 0.2s;
  }

  input[type="checkbox"]:checked + .button .power-off .circle {
    transform: rotate(302deg);
  }

  /* Animations */
  @keyframes line-animation {
    0% {
      transform: translateY(0);
    }
    10% {
      transform: translateY(10px);
    }
    40% {
      transform: translateY(-25px);
    }
    60% {
      transform: translateY(-25px);
    }
    85% {
      transform: translateY(10px);
    }
    100% {
      transform: translateY(0);
    }
  }

  @keyframes click-animation {
    0% {
      transform: scale(1);
    }
    50% {
      transform: scale(0.9);
    }
    100% {
      transform: scale(1);
    }
  }
`;

export default AutomatePowerSwitch; 