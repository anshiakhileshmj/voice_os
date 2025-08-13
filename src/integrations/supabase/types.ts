export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      document_interactions: {
        Row: {
          answer: string
          created_at: string
          document_id: string
          id: string
          question: string
          user_id: string
        }
        Insert: {
          answer: string
          created_at?: string
          document_id: string
          id?: string
          question: string
          user_id: string
        }
        Update: {
          answer?: string
          created_at?: string
          document_id?: string
          id?: string
          question?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_interactions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "document_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      document_uploads: {
        Row: {
          file_content: string | null
          file_size: number | null
          file_type: string
          filename: string
          id: string
          processed_content: string | null
          uploaded_at: string
          user_id: string
        }
        Insert: {
          file_content?: string | null
          file_size?: number | null
          file_type: string
          filename: string
          id?: string
          processed_content?: string | null
          uploaded_at?: string
          user_id: string
        }
        Update: {
          file_content?: string | null
          file_size?: number | null
          file_type?: string
          filename?: string
          id?: string
          processed_content?: string | null
          uploaded_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          last_greeted_at: string | null
          name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          last_greeted_at?: string | null
          name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          last_greeted_at?: string | null
          name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      spotify_artists: {
        Row: {
          created_at: string
          followers_count: number | null
          genres: Json | null
          id: string
          image_url: string | null
          name: string
          popularity: number | null
          spotify_artist_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          followers_count?: number | null
          genres?: Json | null
          id?: string
          image_url?: string | null
          name: string
          popularity?: number | null
          spotify_artist_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          followers_count?: number | null
          genres?: Json | null
          id?: string
          image_url?: string | null
          name?: string
          popularity?: number | null
          spotify_artist_id?: string
          user_id?: string
        }
        Relationships: []
      }
      spotify_playlists: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_collaborative: boolean | null
          is_public: boolean | null
          name: string
          owner_id: string | null
          spotify_playlist_id: string
          track_count: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_collaborative?: boolean | null
          is_public?: boolean | null
          name: string
          owner_id?: string | null
          spotify_playlist_id: string
          track_count?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_collaborative?: boolean | null
          is_public?: boolean | null
          name?: string
          owner_id?: string | null
          spotify_playlist_id?: string
          track_count?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      spotify_profiles: {
        Row: {
          country: string | null
          created_at: string
          display_name: string | null
          email: string | null
          followers_count: number | null
          id: string
          product: string | null
          profile_image_url: string | null
          spotify_user_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          followers_count?: number | null
          id?: string
          product?: string | null
          profile_image_url?: string | null
          spotify_user_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          country?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          followers_count?: number | null
          id?: string
          product?: string | null
          profile_image_url?: string | null
          spotify_user_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      spotify_tracks: {
        Row: {
          album_name: string | null
          artist_names: string
          created_at: string
          duration_ms: number | null
          id: string
          image_url: string | null
          name: string
          popularity: number | null
          preview_url: string | null
          spotify_track_id: string
          user_id: string
        }
        Insert: {
          album_name?: string | null
          artist_names: string
          created_at?: string
          duration_ms?: number | null
          id?: string
          image_url?: string | null
          name: string
          popularity?: number | null
          preview_url?: string | null
          spotify_track_id: string
          user_id: string
        }
        Update: {
          album_name?: string | null
          artist_names?: string
          created_at?: string
          duration_ms?: number | null
          id?: string
          image_url?: string | null
          name?: string
          popularity?: number | null
          preview_url?: string | null
          spotify_track_id?: string
          user_id?: string
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          razorpay_customer_id: string | null
          subscribed: boolean
          subscription_end: string | null
          subscription_tier: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          razorpay_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          razorpay_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      transcription_sessions: {
        Row: {
          audio_url: string | null
          created_at: string
          id: string
          transcript: string
          user_id: string
        }
        Insert: {
          audio_url?: string | null
          created_at?: string
          id?: string
          transcript: string
          user_id: string
        }
        Update: {
          audio_url?: string | null
          created_at?: string
          id?: string
          transcript?: string
          user_id?: string
        }
        Relationships: []
      }
      user_history: {
        Row: {
          created_at: string
          id: string
          intent: string | null
          location_data: Json | null
          message: string
          response: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          intent?: string | null
          location_data?: Json | null
          message: string
          response?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          intent?: string | null
          location_data?: Json | null
          message?: string
          response?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          ai_name: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
          voice_gender: string
          voice_id: string
        }
        Insert: {
          ai_name?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          voice_gender?: string
          voice_id?: string
        }
        Update: {
          ai_name?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          voice_gender?: string
          voice_id?: string
        }
        Relationships: []
      }
      user_usage: {
        Row: {
          automations_used: number
          created_at: string
          documents_processed: number
          id: string
          month_year: string
          updated_at: string
          user_id: string | null
          voice_interactions: number
        }
        Insert: {
          automations_used?: number
          created_at?: string
          documents_processed?: number
          id?: string
          month_year: string
          updated_at?: string
          user_id?: string | null
          voice_interactions?: number
        }
        Update: {
          automations_used?: number
          created_at?: string
          documents_processed?: number
          id?: string
          month_year?: string
          updated_at?: string
          user_id?: string | null
          voice_interactions?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_old_history: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_pdf_conversations: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_current_month_usage: {
        Args: { p_user_id: string }
        Returns: {
          voice_interactions: number
          automations_used: number
          documents_processed: number
        }[]
      }
      increment_usage: {
        Args: {
          p_user_id: string
          p_voice_interactions?: number
          p_automations?: number
          p_documents?: number
        }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
