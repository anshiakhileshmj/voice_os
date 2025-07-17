import { supabase } from '@/integrations/supabase/client';

export interface DocumentUpload {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  file_content: string;
  processed_content?: string;
  uploaded_at: string;
}

export interface DocumentInteraction {
  id: string;
  document_id: string;
  question: string;
  answer: string;
  created_at: string;
}

export class DocumentService {
  async uploadDocument(file: File, userId: string): Promise<DocumentUpload> {
    try {
      // Read file content
      const content = await this.extractTextFromFile(file);
      
      const { data, error } = await supabase
        .from('document_uploads')
        .insert({
          user_id: userId,
          filename: file.name,
          file_type: file.type,
          file_size: file.size,
          file_content: content
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Document upload error:', error);
      throw error;
    }
  }

  async getUserDocuments(userId: string): Promise<DocumentUpload[]> {
    try {
      const { data, error } = await supabase
        .from('document_uploads')
        .select('*')
        .eq('user_id', userId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Get documents error:', error);
      throw error;
    }
  }

  async processDocument(documentId: string, action: string, question?: string): Promise<string> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('User not authenticated');
      }

      const response = await fetch('https://uasluhbtcpuigwkuslum.supabase.co/functions/v1/process-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhc2x1aGJ0Y3B1aWd3a3VzbHVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzNDkwOTUsImV4cCI6MjA2NjkyNTA5NX0.hmdgaWm1-Xso9ZIQHiVSWcuPEfu4qmat-YR1qoYAFAs',
        },
        body: JSON.stringify({
          documentId,
          action,
          question
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to process document');
      }

      const result = await response.json();
      return result.result;
    } catch (error) {
      console.error('Document processing error:', error);
      throw error;
    }
  }

  async getDocumentInteractions(documentId: string): Promise<DocumentInteraction[]> {
    try {
      const { data, error } = await supabase
        .from('document_interactions')
        .select('*')
        .eq('document_id', documentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Get document interactions error:', error);
      throw error;
    }
  }

  private async extractTextFromFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const content = e.target?.result as string;
        
        if (file.type === 'text/plain') {
          resolve(content);
        } else if (file.type === 'application/pdf') {
          // For PDFs, we store the base64 content for Gemini processing
          resolve(content);
        } else {
          resolve(content);
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      
      // Read PDF as data URL for base64 encoding
      if (file.type === 'application/pdf') {
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file);
      }
    });
  }

  getSupportedFileTypes(): string[] {
    return ['.txt', '.pdf'];
  }

  isFileTypeSupported(file: File): boolean {
    return file.type === 'text/plain' || 
           file.type === 'application/pdf' ||
           file.name.toLowerCase().endsWith('.txt') ||
           file.name.toLowerCase().endsWith('.pdf');
  }
}

export const documentService = new DocumentService();