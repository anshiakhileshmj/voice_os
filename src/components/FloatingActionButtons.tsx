
import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Upload, LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { spotifyService } from '@/services/spotifyService';
import { automateService } from '@/services/automateService';
import { documentService } from '@/services/documentService';

interface FloatingActionButtonsProps {
  isSpotifyEnabled: boolean;
  isSpotifyConnected: boolean;
  isAutomateEnabled: boolean;
  isAutomateConnected: boolean;
  onSpotifyToggle: (enabled: boolean) => void;
  onAutomateToggle: (enabled: boolean) => void;
  onDocumentUpload: (response: string, document?: any) => void;
}

const FloatingActionButtons: React.FC<FloatingActionButtonsProps> = ({
  isSpotifyEnabled,
  isSpotifyConnected,
  isAutomateEnabled,
  isAutomateConnected,
  onSpotifyToggle,
  onAutomateToggle,
  onDocumentUpload,
}) => {
  const { signOut, user } = useAuth();
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      try {
        if (!user) {
          toast({
            title: "Authentication Required",
            description: "Please log in to upload documents.",
            variant: "destructive"
          });
          return;
        }

        const response = await documentService.uploadDocument(file, user.id);
        onDocumentUpload("PDF uploaded successfully!", response);
        toast({
          title: "PDF Uploaded",
          description: "Your PDF has been processed successfully.",
        });
      } catch (error) {
        toast({
          title: "Upload Failed",
          description: "Failed to upload and process PDF.",
          variant: "destructive"
        });
      }
    } else {
      toast({
        title: "Invalid File",
        description: "Please select a PDF file.",
        variant: "destructive"
      });
    }
    event.target.value = ''; // Clear the input
  };

  const handleLogout = () => {
    signOut();
  };

  const handleSpotifyToggle = async () => {
    if (!isSpotifyEnabled) {
      onSpotifyToggle(true);
      if (!isSpotifyConnected) {
        try {
          await spotifyService.initiateAuth();
        } catch (error) {
          console.error('Spotify connection error:', error);
          onSpotifyToggle(false);
        }
      }
    } else {
      onSpotifyToggle(false);
    }
  };

  const handleAutomateToggle = async () => {
    onAutomateToggle(!isAutomateEnabled);
  };

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        <div className="flex flex-col gap-4">
          {/* Spotify Button */}
          <button 
            onClick={handleSpotifyToggle}
            className="p-5 rounded-full backdrop-blur-lg border border-green-500/20 bg-gradient-to-tr from-black/60 to-black/40 shadow-lg hover:shadow-2xl hover:shadow-green-500/30 hover:scale-110 hover:rotate-2 active:scale-95 active:rotate-0 transition-all duration-300 ease-out cursor-pointer hover:border-green-500/50 hover:bg-gradient-to-tr hover:from-green-500/10 hover:to-black/40 group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-green-400/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out"></div>
            <div className="relative z-10">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 496 512" className={`w-7 h-7 fill-current transition-colors duration-300 ${isSpotifyEnabled ? 'text-green-400' : 'text-green-500'} group-hover:text-green-400`}>
                <path d="M248 8C111.1 8 0 119.1 0 256s111.1 248 248 248 248-111.1 248-248S384.9 8 248 8zm100.7 364.9c-4.2 0-6.8-1.3-10.7-3.6-62.4-37.6-135-39.2-206.7-24.5-3.9 1-9 2.6-11.9 2.6-9.7 0-15.8-7.7-15.8-15.8 0-10.3 6.1-15.2 13.6-16.8 81.9-18.1 165.6-16.5 237 30.2 6.1 3.9 9.7 7.4 9.7 16.5s-7.1 15.4-15.2 15.4zm26.9-65.6c-5.2 0-8.7-2.3-12.3-4.2-62.5-37-155.7-51.9-238.6-29.4-4.8 1.3-7.4 2.6-11.9 2.6-10.7 0-19.4-8.7-19.4-19.4s5.2-17.8 15.5-20.7c27.8-7.8 56.2-13.6 97.8-13.6 64.9 0 127.6 16.1 177 45.5 8.1 4.8 11.3 11 11.3 19.7-.1 10.8-8.5 19.5-19.4 19.5zm31-76.2c-5.2 0-8.4-1.3-12.9-3.9-71.2-42.5-198.5-52.7-280.9-29.7-3.6 1-8.1 2.6-12.9 2.6-13.2 0-23.3-10.3-23.3-23.6 0-13.6 8.4-21.3 17.4-23.9 35.2-10.3 74.6-15.2 117.5-15.2 73 0 149.5 15.2 205.4 47.8 7.8 4.5 12.9 10.7 12.9 22.6 0 13.6-11 23.3-23.2 23.3z" />
              </svg>
            </div>
          </button>

          {/* Automate Button */}
          <div className="flex justify-center">
            <div className="power-switch" onClick={handleAutomateToggle}>
              <input type="checkbox" id="power-toggle" checked={isAutomateEnabled} readOnly />
              <div className="button">
                <svg className="power-off" viewBox="0 0 150 150">
                  <line x1="75" y1="34" x2="75" y2="58" className="line" />
                  <circle cx="75" cy="80" r="35" className="circle" />
                </svg>
                <svg className="power-on" viewBox="0 0 150 150">
                  <line x1="75" y1="34" x2="75" y2="58" className="line" />
                  <circle cx="75" cy="80" r="35" className="circle" />
                </svg>
              </div>
            </div>
          </div>

          {/* PDF Upload Button */}
          <label className="p-5 rounded-full backdrop-blur-lg border border-blue-500/20 bg-gradient-to-tr from-black/60 to-black/40 shadow-lg hover:shadow-2xl hover:shadow-blue-500/30 hover:scale-110 hover:-rotate-2 active:scale-95 active:rotate-0 transition-all duration-300 ease-out cursor-pointer hover:border-blue-500/50 hover:bg-gradient-to-tr hover:from-blue-500/10 hover:to-black/40 group relative overflow-hidden">
            <input 
              type="file" 
              accept=".pdf" 
              onChange={handleFileUpload} 
              className="hidden" 
            />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out"></div>
            <div className="relative z-10">
              <Upload className="w-7 h-7 text-blue-500 group-hover:text-blue-400 transition-colors duration-300" />
            </div>
          </label>

          {/* Logout Button */}
          <button 
            onClick={handleLogout}
            className="p-5 rounded-full backdrop-blur-lg border border-red-500/20 bg-gradient-to-tr from-black/60 to-black/40 shadow-lg hover:shadow-2xl hover:shadow-red-500/30 hover:scale-110 hover:rotate-2 active:scale-95 active:rotate-0 transition-all duration-300 ease-out cursor-pointer hover:border-red-500/50 hover:bg-gradient-to-tr hover:from-red-500/10 hover:to-black/40 group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-400/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out"></div>
            <div className="relative z-10">
              <LogOut className="w-7 h-7 text-red-500 group-hover:text-red-400 transition-colors duration-300" />
            </div>
          </button>
        </div>
      </div>

      {/* Embedded CSS using dangerouslySetInnerHTML */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .power-switch {
            --color-invert: #ffffff;
            --width: 68px;
            --height: 68px;
            position: relative;
            width: var(--width);
            height: var(--height);
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 14px;
            border-radius: 50%;
            backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            background: linear-gradient(to top right, rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.4));
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            cursor: pointer;
          }

          .power-switch:hover {
            transform: scale(1.1);
            box-shadow: 0 25px 25px -5px rgba(255, 255, 255, 0.1), 0 10px 10px -5px rgba(255, 255, 255, 0.04);
            border-color: rgba(255, 255, 255, 0.3);
            background: linear-gradient(to top right, rgba(255, 255, 255, 0.1), rgba(0, 0, 0, 0.4));
          }

          .power-switch:active {
            transform: scale(0.95);
          }

          .button {
            width: 100%;
            height: 100%;
            position: relative;
            display: flex;
            justify-content: center;
            align-items: center;
            border-radius: 100%;
            overflow: hidden;
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
            border-radius: 50%;
            z-index: -1;
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

          .power-switch:hover .power-on,
          .power-switch:hover .power-off {
            stroke: rgba(255, 255, 255, 0.9);
          }

          .power-switch:hover .power-on .line,
          .power-switch:hover .power-off .line {
            opacity: 0.4;
          }

          .power-switch:hover .power-on .circle,
          .power-switch:hover .power-off .circle {
            opacity: 0.4;
          }

          @keyframes line-animation {
            0% { transform: translateY(0); }
            10% { transform: translateY(10px); }
            40% { transform: translateY(-25px); }
            60% { transform: translateY(-25px); }
            85% { transform: translateY(10px); }
            100% { transform: translateY(0); }
          }

          @keyframes click-animation {
            0% { transform: scale(1); }
            50% { transform: scale(0.9); }
            100% { transform: scale(1); }
          }

          .power-switch .button::before {
            content: "";
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
            transition: left 0.7s ease;
          }

          .power-switch:hover .button::before {
            left: 100%;
          }
        `
      }} />
    </>
  );
};

export default FloatingActionButtons;
