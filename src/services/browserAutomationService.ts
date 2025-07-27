
export interface BrowserAutomationAction {
  action: string;
  element?: string;
  value?: string;
  url?: string;
  selector?: string;
  text?: string;
  coordinate?: { x: number; y: number };
}

export interface BrowserAutomationRequest {
  actions: BrowserAutomationAction[];
  objective: string;
  url?: string;
}

export interface BrowserAutomationResponse {
  success: boolean;
  message: string;
  screenshot?: string;
  error?: string;
}

export class BrowserAutomationService {
  private baseUrl: string;
  private isConnected: boolean = false;

  constructor() {
    this.baseUrl = 'http://localhost:8001'; // Different port for browser automation
  }

  async checkConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      this.isConnected = response.ok;
      return this.isConnected;
    } catch (error) {
      console.error('Browser automation service connection failed:', error);
      this.isConnected = false;
      return false;
    }
  }

  async executeBrowserActions(request: BrowserAutomationRequest): Promise<BrowserAutomationResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/automate-browser`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || 'Failed to execute browser automation');
      }

      return await response.json();
    } catch (error) {
      console.error('Browser automation execution failed:', error);
      return {
        success: false,
        message: 'Failed to execute browser automation',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async generateBrowserActions(objective: string): Promise<BrowserAutomationAction[]> {
    try {
      const response = await fetch(`${this.baseUrl}/generate-browser-actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ objective }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || 'Failed to generate browser actions');
      }

      const result = await response.json();
      return result.actions || [];
    } catch (error) {
      console.error('Browser action generation failed:', error);
      throw new Error('Failed to generate browser automation actions');
    }
  }

  isServiceConnected(): boolean {
    return this.isConnected;
  }

  setBaseUrl(url: string): void {
    this.baseUrl = url;
  }
}

export const browserAutomationService = new BrowserAutomationService();
