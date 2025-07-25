import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, File, Trash2, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { documentService, DocumentUpload as DocType } from '@/services/documentService';
import { useAuth } from '@/hooks/useAuth';

interface DocumentUploadProps {
  onDocumentProcessed: (result: string, document?: any) => void;
}

const DocumentUpload = ({ onDocumentProcessed }: DocumentUploadProps) => {
  const [documents, setDocuments] = useState<DocType[]>([]);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || !user) return;

    const file = files[0];
    
    if (!documentService.isFileTypeSupported(file)) {
      toast({
        title: "Unsupported File Type",
        description: "Please upload .txt or .pdf files only.",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    try {
      const uploadedDoc = await documentService.uploadDocument(file, user.id);
      setDocuments(prev => [uploadedDoc, ...prev]);
      
      toast({
        title: "Upload Successful",
        description: "Should I summarize the file or if you wish anything else let me know."
      });
      
      onDocumentProcessed("Upload successful! Should I summarize the file or if you wish anything else let me know.", uploadedDoc);
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload document.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const processDocument = async (documentId: string, action: string, question?: string) => {
    setProcessing(documentId);
    try {
      const result = await documentService.processDocument(documentId, action, question);
      onDocumentProcessed(result, { id: documentId });
      
      toast({
        title: "Processing Complete",
        description: `Document ${action} completed successfully.`
      });
    } catch (error) {
      toast({
        title: "Processing Failed",
        description: error instanceof Error ? error.message : "Failed to process document.",
        variant: "destructive"
      });
    } finally {
      setProcessing(null);
    }
  };

  const loadUserDocuments = async () => {
    if (!user) return;
    
    try {
      const userDocs = await documentService.getUserDocuments(user.id);
      setDocuments(userDocs);
    } catch (error) {
      console.error('Failed to load documents:', error);
    }
  };

  // Load documents on component mount
  React.useEffect(() => {
    loadUserDocuments();
  }, [user]);

  return (
    <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <File className="w-5 h-5" />
          Document Upload & Processing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Section */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.pdf"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
          <p className="text-sm text-muted-foreground mb-3">
            Upload .txt or .pdf files for AI processing
          </p>
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
          >
            {uploading ? 'Uploading...' : 'Choose File'}
          </Button>
        </div>

        {/* Documents List */}
        {documents.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium">Your Documents</h4>
            {documents.map((doc) => (
              <div key={doc.id} className="border rounded-lg p-3 bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <File className="w-4 h-4" />
                    <span className="text-sm font-medium">{doc.filename}</span>
                    <Badge variant="secondary" className="text-xs">
                      {doc.file_type.includes('pdf') ? 'PDF' : 'TXT'}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(doc.uploaded_at).toLocaleDateString()}
                  </span>
                </div>
                
                <div className="flex gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => processDocument(doc.id, 'summarize')}
                    disabled={processing === doc.id}
                    className="text-xs"
                  >
                    {processing === doc.id ? 'Processing...' : 'Summarize'}
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => processDocument(doc.id, 'extract')}
                    disabled={processing === doc.id}
                    className="text-xs"
                  >
                    Extract Text
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => processDocument(doc.id, 'format')}
                    disabled={processing === doc.id}
                    className="text-xs"
                  >
                    Format
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          <p>• Supported formats: .txt, .pdf</p>
          <p>• AI capabilities: summarization, text extraction, formatting, Q&A</p>
          <p>• History stored for 30 days</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default DocumentUpload;