
export class FileSystemService {
  async searchAndProcessFile(filename: string): Promise<{ found: boolean; content?: string; error?: string }> {
    try {
      // Check if we're in Electron environment
      if (typeof window !== 'undefined' && (window as any).electronAPI) {
        const result = await (window as any).electronAPI.searchPDFFile(filename);
        return result;
      } else {
        return {
          found: false,
          error: 'File system access not available in browser environment'
        };
      }
    } catch (error) {
      return {
        found: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async getAllPDFFiles(): Promise<string[]> {
    try {
      if (typeof window !== 'undefined' && (window as any).electronAPI) {
        return await (window as any).electronAPI.getAllPDFFiles();
      }
      return [];
    } catch (error) {
      console.error('Error getting PDF files:', error);
      return [];
    }
  }
}

export const fileSystemService = new FileSystemService();
