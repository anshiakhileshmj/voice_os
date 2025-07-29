
export interface AutomateAction {
  operation: string;
  thought?: string;
  x?: string;
  y?: string;
  keys?: string[];
  content?: string;
  summary?: string;
}

export interface AutomateRequest {
  actions: AutomateAction[];
  objective: string;
}

export interface AutomateResponse {
  success: boolean;
  message: string;
  executedActions?: number;
  error?: string;
}

export class AutomateService {
  private baseUrl: string;
  private isConnected: boolean = false;

  constructor() {
    // Default to localhost for development, will be configurable
    this.baseUrl = 'http://localhost:8000';
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
      console.error('Automate service connection failed:', error);
      this.isConnected = false;
      return false;
    }
  }

  async executeActions(request: AutomateRequest): Promise<AutomateResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/automate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || 'Failed to execute automation');
      }

      return await response.json();
    } catch (error) {
      console.error('Automation execution failed:', error);
      return {
        success: false,
        message: 'Failed to execute automation',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async generateActions(objective: string): Promise<AutomateAction[]> {
    try {
      const response = await fetch(`${this.baseUrl}/generate-actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ objective }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || 'Failed to generate actions');
      }

      const result = await response.json();
      return result.actions || [];
    } catch (error) {
      console.error('Action generation failed:', error);
      throw new Error('Failed to generate automation actions');
    }
  }

  isServiceConnected(): boolean {
    return this.isConnected;
  }

  setBaseUrl(url: string): void {
    this.baseUrl = url;
  }
}

export const automateService = new AutomateService();
