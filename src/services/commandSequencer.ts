
export interface QueuedCommand {
  message: string;
  timestamp: number;
  id: string;
}

export class CommandSequencer {
  private commandQueue: QueuedCommand[] = [];
  private sequenceTimeout: NodeJS.Timeout | null = null;
  private readonly SEQUENCE_WINDOW = 2000; // 2 seconds to wait for more commands
  private readonly MAX_QUEUE_SIZE = 5;

  addCommand(message: string): Promise<string[]> {
    return new Promise((resolve) => {
      // Add command to queue
      const command: QueuedCommand = {
        message: message.trim(),
        timestamp: Date.now(),
        id: Math.random().toString(36).substr(2, 9)
      };

      this.commandQueue.push(command);
      
      // Limit queue size
      if (this.commandQueue.length > this.MAX_QUEUE_SIZE) {
        this.commandQueue = this.commandQueue.slice(-this.MAX_QUEUE_SIZE);
      }

      // Clear existing timeout
      if (this.sequenceTimeout) {
        clearTimeout(this.sequenceTimeout);
      }

      // Set new timeout to process commands
      this.sequenceTimeout = setTimeout(() => {
        const commands = this.processQueue();
        resolve(commands);
      }, this.SEQUENCE_WINDOW);
    });
  }

  private processQueue(): string[] {
    if (this.commandQueue.length === 0) return [];

    // Remove duplicates and very similar commands
    const uniqueCommands = this.deduplicateCommands();
    
    // Clear the queue
    this.commandQueue = [];
    this.sequenceTimeout = null;

    return uniqueCommands;
  }

  private deduplicateCommands(): string[] {
    const seen = new Set<string>();
    const unique: string[] = [];

    for (const command of this.commandQueue) {
      const normalized = command.message.toLowerCase().trim();
      
      // Skip if we've seen this exact command
      if (seen.has(normalized)) continue;
      
      // Skip if it's very similar to a recent command (basic similarity check)
      const isSimilar = Array.from(seen).some(existingCmd => {
        return this.calculateSimilarity(normalized, existingCmd) > 0.8;
      });

      if (!isSimilar) {
        seen.add(normalized);
        unique.push(command.message);
      }
    }

    return unique;
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    return (longer.length - this.levenshteinDistance(longer, shorter)) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  // Force process current queue immediately
  forceProcess(): string[] {
    if (this.sequenceTimeout) {
      clearTimeout(this.sequenceTimeout);
    }
    return this.processQueue();
  }
}

export const commandSequencer = new CommandSequencer();
