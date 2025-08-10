
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Document {
  id: string;
  name: string;
  size: number;
  created_at: string;
}

interface DocumentListProps {
  documents: Document[];
}

export const DocumentList: React.FC<DocumentListProps> = ({ documents }) => {
  if (documents.length === 0) {
    return (
      <Card>
        <CardContent className="p-4">
          <p className="text-gray-500 text-center">No documents uploaded yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Uploaded Documents</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {documents.map((doc) => (
            <div key={doc.id} className="flex justify-between items-center p-2 border rounded">
              <span className="font-medium">{doc.name}</span>
              <span className="text-sm text-gray-500">
                {(doc.size / 1024).toFixed(1)} KB
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
