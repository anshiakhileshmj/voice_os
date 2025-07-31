import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { spotifyService } from '@/services/spotifyService';
import { documentService } from '@/services/documentService';
import { AutomateAction } from '@/services/automateService';
import { ModeToggle } from '@/components/mode-toggle';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import FloatingActionButtons from '@/components/FloatingActionButtons';
import AutomatePowerSwitch from '@/components/AutomatePowerSwitch';
import { useAutomation } from '@/hooks/useAutomation';

const Index = () => {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [isSpotifyEnabled, setIsSpotifyEnabled] = useState(false);
  const [isSpotifyConnected, setIsSpotifyConnected] = useState(false);
  const [documentResponse, setDocumentResponse] = useState<string | null>(null);
  const [documentContent, setDocumentContent] = useState<any>(null);
  const [generatedActions, setGeneratedActions] = useState<AutomateAction[]>([]);
  const [objective, setObjective] = useState('');
  const [isObjectiveLoading, setIsObjectiveLoading] = useState(false);

  const {
    isEnabled: isAutomateEnabled,
    isConnected: isAutomateConnected,
    isServerStarting,
    toggleAutomation
  } = useAutomation();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    const checkSpotifyConnection = async () => {
      if (isSpotifyEnabled) {
        const connected = await spotifyService.checkConnection();
        setIsSpotifyConnected(connected);
      }
    };

    checkSpotifyConnection();
  }, [isSpotifyEnabled]);

  const handleSpotifyToggle = (enabled: boolean) => {
    setIsSpotifyEnabled(enabled);
  };

  const handleAutomateToggle = (enabled: boolean) => {
    toggleAutomation(enabled);
  };

  const handleDocumentUpload = (response: string, document?: any) => {
    setDocumentResponse(response);
    setDocumentContent(document);
  };

  const handleObjectiveChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setObjective(e.target.value);
  };

  const handleGenerateActions = async () => {
    if (!objective) {
      toast({
        title: "Objective Required",
        description: "Please enter an objective to generate actions.",
        variant: "destructive"
      });
      return;
    }

    setIsObjectiveLoading(true);
    try {
      const actions = await spotifyService.generateActions(objective);
      setGeneratedActions(actions);
      toast({
        title: "Actions Generated",
        description: "Automation actions have been generated.",
      });
    } catch (error: any) {
      toast({
        title: "Action Generation Failed",
        description: error.message || "Failed to generate automation actions.",
        variant: "destructive"
      });
    } finally {
      setIsObjectiveLoading(false);
    }
  };

  if (isLoading) {
    return <Skeleton className="h-12 w-[200px]" />;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="container relative min-h-screen flex-center flex-col">
      <ModeToggle />
      <h1 className="scroll-m-20 text-2xl font-semibold tracking-tight transition-colors">
        Welcome to MJAK Automation, {user.name}
      </h1>
      <p className="text-muted-foreground">
        {user.email}
      </p>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mt-8">
        <div className="border rounded-md p-4">
          <h2 className="text-lg font-semibold mb-2">Document Upload</h2>
          <p className="text-sm text-muted-foreground">Upload a PDF document to process.</p>
          {documentResponse && (
            <div className="mt-2">
              <p className="text-green-500">{documentResponse}</p>
            </div>
          )}
          {documentContent && (
            <div className="mt-2">
              <p className="text-blue-500">Document Content: {documentContent.summary}</p>
            </div>
          )}
        </div>

        <div className="border rounded-md p-4">
          <h2 className="text-lg font-semibold mb-2">Spotify Integration</h2>
          <p className="text-sm text-muted-foreground">Enable Spotify integration to automate tasks.</p>
          <div className="flex items-center space-x-2 mt-2">
            <Switch id="spotify" checked={isSpotifyEnabled} onCheckedChange={handleSpotifyToggle} />
            <Label htmlFor="spotify">
              {isSpotifyEnabled
                ? isSpotifyConnected
                  ? "Spotify Connected"
                  : "Connecting..."
                : "Enable Spotify"}
            </Label>
          </div>
        </div>

        <div className="border rounded-md p-4">
          <h2 className="text-lg font-semibold mb-2">MJAK Automation</h2>
          <p className="text-sm text-muted-foreground">Enable MJAK automation to perform tasks.</p>
          <div className="flex items-center space-x-2 mt-2">
            <AutomatePowerSwitch checked={isAutomateEnabled} onChange={handleAutomateToggle} />
            <Label htmlFor="automate">
              {isAutomateEnabled
                ? isAutomateConnected
                  ? "Automation Enabled"
                  : "Connecting..."
                : "Enable Automation"}
            </Label>
          </div>
        </div>
      </div>

      <div className="w-full max-w-md mt-8">
        <h2 className="text-lg font-semibold mb-2">Generate Automation Actions</h2>
        <p className="text-sm text-muted-foreground">Enter an objective to generate automation actions.</p>
        <div className="flex space-x-2 mt-2">
          <input
            type="text"
            placeholder="Enter objective"
            value={objective}
            onChange={handleObjectiveChange}
            className="border rounded-md p-2 w-full"
          />
          <button
            onClick={handleGenerateActions}
            className="bg-blue-500 text-white rounded-md p-2 hover:bg-blue-600"
            disabled={isObjectiveLoading}
          >
            {isObjectiveLoading ? "Generating..." : "Generate"}
          </button>
        </div>
      </div>

      {generatedActions.length > 0 && (
        <div className="w-full max-w-md mt-8">
          <h2 className="text-lg font-semibold mb-2">Generated Actions</h2>
          <Accordion type="single" collapsible>
            {generatedActions.map((action, index) => (
              <AccordionItem value={`item-${index}`} key={index}>
                <AccordionTrigger>{action.operation}</AccordionTrigger>
                <AccordionContent>
                  <pre>{JSON.stringify(action, null, 2)}</pre>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      )}

      <FloatingActionButtons
        isSpotifyEnabled={isSpotifyEnabled}
        isSpotifyConnected={isSpotifyConnected}
        isAutomateEnabled={isAutomateEnabled}
        isAutomateConnected={isAutomateConnected}
        onSpotifyToggle={handleSpotifyToggle}
        onAutomateToggle={handleAutomateToggle}
        onDocumentUpload={handleDocumentUpload}
      />
    </div>
  );
};

export default Index;
