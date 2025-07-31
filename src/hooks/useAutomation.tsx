import { useState, useEffect } from 'react';
import { automateService } from '@/services/automateService';
import { useToast } from '@/hooks/use-toast';

export const useAutomation = () => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isServerStarting, setIsServerStarting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Auto-start the Python server when the app loads
    startPythonServer();
  }, []);

  const startPythonServer = async () => {
    setIsServerStarting(true);
    
    try {
      // For desktop app, spawn the Python server process
      if (window.electronAPI) {
        await window.electronAPI.startPythonServer();
      }
      
      // Wait a moment for server to start
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Check connection
      const connected = await automateService.checkConnection();
      setIsConnected(connected);
      
      if (!connected) {
        toast({
          title: "Automation Service Starting",
          description: "The automation service is initializing. Please wait...",
        });
        
        // Keep trying to connect
        const maxRetries = 10;
        let retries = 0;
        
        const checkInterval = setInterval(async () => {
          const isReady = await automateService.checkConnection();
          if (isReady || retries >= maxRetries) {
            clearInterval(checkInterval);
            setIsConnected(isReady);
            setIsServerStarting(false);
            
            if (isReady) {
              toast({
                title: "Automation Service Ready",
                description: "You can now use automation features.",
              });
            } else {
              toast({
                title: "Automation Service Failed",
                description: "Could not start the automation service. Please check the console.",
                variant: "destructive"
              });
            }
          }
          retries++;
        }, 2000);
      } else {
        setIsServerStarting(false);
      }
    } catch (error) {
      console.error('Failed to start Python server:', error);
      setIsServerStarting(false);
      toast({
        title: "Server Start Failed",
        description: "Failed to start the automation server.",
        variant: "destructive"
      });
    }
  };

  const toggleAutomation = (enabled: boolean) => {
    if (!isConnected && enabled) {
      toast({
        title: "Service Not Ready",
        description: "Automation service is not ready. Please wait for it to start.",
        variant: "destructive"
      });
      return;
    }
    
    setIsEnabled(enabled);
    
    if (enabled) {
      toast({
        title: "Automation Enabled",
        description: "MJAK automation is now active.",
      });
    } else {
      toast({
        title: "Automation Disabled",
        description: "MJAK automation is now inactive.",
      });
    }
  };

  return {
    isEnabled,
    isConnected,
    isServerStarting,
    toggleAutomation,
    startPythonServer
  };
};
