
import { supabase } from '@/integrations/supabase/client';

export interface UserCommand {
  id: string;
  user_id: string;
  command: string;
  intent: string;
  timestamp: string;
  response: string;
  created_at: string;
}

export interface UserBehaviorSummary {
  id: string;
  user_id: string;
  behavior_summary: string;
  period_start: string;
  period_end: string;
  created_at: string;
}

export class UserHistoryService {
  async saveUserCommand(
    command: string,
    intent: string,
    response: string,
    userId: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_commands')
        .insert({
          user_id: userId,
          command,
          intent,
          response,
          timestamp: new Date().toISOString()
        });

      if (error) {
        console.error('Error saving user command:', error);
      }
    } catch (error) {
      console.error('Error saving user command:', error);
    }
  }

  async getUserCommands(userId: string, limit: number = 100): Promise<UserCommand[]> {
    try {
      const { data, error } = await supabase
        .from('user_commands')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching user commands:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching user commands:', error);
      return [];
    }
  }

  async getUserBehaviorSummary(userId: string): Promise<UserBehaviorSummary | null> {
    try {
      const { data, error } = await supabase
        .from('user_behavior_summaries')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user behavior summary:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching user behavior summary:', error);
      return null;
    }
  }
}

export const userHistoryService = new UserHistoryService();
