
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { llmService, ConversationMessage } from '@/services/llmService';
import { locationService } from '@/services/locationService';
import { documentService } from '@/services/documentService';
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { FileInput } from '@/components/FileInput';
import { DocumentList } from '@/components/DocumentList';
import PricingIcon from '@/components/PricingIcon';

const Index = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [locationData, setLocationData] = useState<{ city: string; region: string; country: string }>({
    city: 'Unknown',
    region: 'Unknown',
    country: 'Unknown',
  });
  const [greeting, setGreeting] = useState('');
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [uploadedDocuments, setUploadedDocuments] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    const fetchLocationAndGreeting = async () => {
      try {
        const location = await locationService.getUserLocation();
        setLocationData({
          city: location.city,
          region: location.region,
          country: location.country,
        });

        const shouldGreet = await locationService.shouldGreetUser(user.id);
        if (shouldGreet) {
          const userDisplayName = user.email?.split('@')[0] || 'User';
          const newGreeting = locationService.getGreeting(location.timezone, userDisplayName);
          setGreeting(newGreeting);
          await locationService.updateLastGreeted(user.id);
        } else {
          const userDisplayName = user.email?.split('@')[0] || 'User';
          setGreeting(`Welcome back, ${userDisplayName}`);
        }
      } catch (error) {
        console.error('Error fetching location and greeting:', error);
        const userDisplayName = user.email?.split('@')[0] || 'User';
        setGreeting(`Hello, ${userDisplayName}`);
      }
    };

    const fetchDocuments = async () => {
      try {
        const documents = await documentService.getUserDocuments(user.id);
        setUploadedDocuments(documents);
      } catch (error) {
        console.error('Error fetching documents:', error);
        toast({
          title: "Failed to Load Documents",
          description: "There was an error loading your documents. Please try again later.",
          variant: "destructive"
        });
      }
    };

    fetchLocationAndGreeting();
    fetchDocuments();
  }, [user, navigate]);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    try {
      setLoading(true);
      const { response: llmResponse, updatedHistory } = await llmService.generateResponse(
        message,
        conversationHistory
      );

      setResponse(llmResponse);
      setConversationHistory(updatedHistory);
      setMessage('');
    } catch (error: any) {
      console.error('LLM error:', error);
      toast({
        title: "LLM Error",
        description: error.message || "Failed to get response from the AI. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File | null) => {
    if (!file) return;

    try {
      const uploaded = await documentService.uploadDocument(file, user.id);
      setUploadedDocuments(prev => [uploaded, ...prev]);
      toast({
        title: "File Uploaded",
        description: `${file.name} has been successfully uploaded.`,
      });
    } catch (error: any) {
      console.error('File upload error:', error);
      toast({
        title: "File Upload Error",
        description: error.message || "Failed to upload the file. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex flex-col">
      <PricingIcon />
      <header className="p-4 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold text-white">{greeting}</h1>
          <p className="text-gray-400">
            {locationData.city}, {locationData.region}, {locationData.country}
          </p>
        </div>
        <Button variant="destructive" onClick={handleSignOut}>Sign Out</Button>
      </header>

      <main className="flex-grow p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>AI Chat Interface</CardTitle>
              <CardDescription>
                Interact with the AI, ask questions, and explore its capabilities.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-2">
                <Textarea
                  placeholder="Enter your message here..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="flex-grow"
                />
                <Button onClick={handleSendMessage} disabled={loading}>
                  {loading ? "Sending..." : "Send"}
                </Button>
              </div>
              {response && (
                <div className="mt-4">
                  <Label>Response:</Label>
                  <p>{response}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Document Management</CardTitle>
              <CardDescription>
                Upload documents for processing and analysis.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FileInput onFileSelect={handleFileUpload} />
              <DocumentList documents={uploadedDocuments} />
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="p-4 text-center text-gray-500">
        <p>&copy; 2024 MJAK AI. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Index;
