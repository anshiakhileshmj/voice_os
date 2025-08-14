
export interface ConversationTurn {
  id: string;
  timestamp: number;
  userInput: string;
  aiResponse: string;
  confidence: number;
  isPartial?: boolean;
}

export interface ConversationContext {
  sessionId: string;
  turns: ConversationTurn[];
  currentTopic?: string;
  userPreferences: Record<string, any>;
  lastActivity: number;
}

class ConversationContextService {
  private context: ConversationContext;
  private readonly MAX_TURNS = 10; // Keep last 10 conversation turns
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  constructor() {
    this.context = this.initializeContext();
  }

  private initializeContext(): ConversationContext {
    return {
      sessionId: this.generateSessionId(),
      turns: [],
      userPreferences: {},
      lastActivity: Date.now()
    };
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  addPartialTranscript(transcript: string, confidence: number): void {
    this.context.lastActivity = Date.now();
    
    // Update or add partial turn
    const lastTurn = this.context.turns[this.context.turns.length - 1];
    if (lastTurn && lastTurn.isPartial) {
      lastTurn.userInput = transcript;
      lastTurn.confidence = confidence;
      lastTurn.timestamp = Date.now();
    } else {
      this.context.turns.push({
        id: `turn_${Date.now()}`,
        timestamp: Date.now(),
        userInput: transcript,
        aiResponse: '',
        confidence,
        isPartial: true
      });
    }
    
    console.log('Updated partial transcript:', transcript);
  }

  finalizeTurn(finalTranscript: string, confidence: number): string {
    this.context.lastActivity = Date.now();
    
    const lastTurn = this.context.turns[this.context.turns.length - 1];
    if (lastTurn && lastTurn.isPartial) {
      // Update existing partial turn
      lastTurn.userInput = finalTranscript;
      lastTurn.confidence = confidence;
      lastTurn.isPartial = false;
    } else {
      // Create new turn
      this.context.turns.push({
        id: `turn_${Date.now()}`,
        timestamp: Date.now(),
        userInput: finalTranscript,
        aiResponse: '',
        confidence,
        isPartial: false
      });
    }
    
    // Cleanup old turns
    if (this.context.turns.length > this.MAX_TURNS) {
      this.context.turns = this.context.turns.slice(-this.MAX_TURNS);
    }
    
    console.log('Finalized conversation turn:', finalTranscript);
    return this.context.turns[this.context.turns.length - 1].id;
  }

  addAIResponse(turnId: string, response: string): void {
    const turn = this.context.turns.find(t => t.id === turnId);
    if (turn) {
      turn.aiResponse = response;
      this.context.lastActivity = Date.now();
    }
  }

  getContextForLLM(): string {
    const recentTurns = this.context.turns
      .filter(turn => !turn.isPartial)
      .slice(-5); // Last 5 complete turns
    
    if (recentTurns.length === 0) return '';
    
    let contextPrompt = 'Recent conversation context:\n';
    recentTurns.forEach((turn, index) => {
      contextPrompt += `Turn ${index + 1}:\n`;
      contextPrompt += `User: ${turn.userInput}\n`;
      if (turn.aiResponse) {
        contextPrompt += `Assistant: ${turn.aiResponse}\n`;
      }
      contextPrompt += '\n';
    });
    
    return contextPrompt;
  }

  getCurrentTopic(): string | undefined {
    return this.context.currentTopic;
  }

  updateTopic(topic: string): void {
    this.context.currentTopic = topic;
    console.log('Updated conversation topic:', topic);
  }

  isSessionActive(): boolean {
    return (Date.now() - this.context.lastActivity) < this.SESSION_TIMEOUT;
  }

  resetSession(): void {
    console.log('Resetting conversation session');
    this.context = this.initializeContext();
  }

  getSessionStats(): {
    sessionId: string;
    turnCount: number;
    averageConfidence: number;
    sessionDuration: number;
  } {
    const completeTurns = this.context.turns.filter(t => !t.isPartial);
    const avgConfidence = completeTurns.length > 0 
      ? completeTurns.reduce((sum, turn) => sum + turn.confidence, 0) / completeTurns.length 
      : 0;
    
    const sessionStart = completeTurns.length > 0 ? completeTurns[0].timestamp : Date.now();
    const sessionDuration = Date.now() - sessionStart;
    
    return {
      sessionId: this.context.sessionId,
      turnCount: completeTurns.length,
      averageConfidence: avgConfidence,
      sessionDuration
    };
  }
}

export const conversationContextService = new ConversationContextService();
