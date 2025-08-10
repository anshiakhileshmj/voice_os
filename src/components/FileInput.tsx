
import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface FileInputProps {
  onFileSelect: (file: File | null) => void;
}

export const FileInput: React.FC<FileInputProps> = ({ onFileSelect }) => {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    onFileSelect(file);
  };

  return (
    <div className="flex items-center space-x-2">
      <Input
        type="file"
        onChange={handleFileChange}
        accept=".pdf,.txt,.doc,.docx"
        className="flex-1"
      />
      <Button variant="outline">Upload</Button>
    </div>
  );
};
