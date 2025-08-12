
-- Add spotify_plays column to user_usage table
ALTER TABLE public.user_usage 
ADD COLUMN spotify_plays INTEGER DEFAULT 0;

-- Update the increment_usage function to handle spotify plays
CREATE OR REPLACE FUNCTION public.increment_usage(
  p_user_id uuid, 
  p_voice_interactions integer DEFAULT 0, 
  p_automations integer DEFAULT 0, 
  p_documents integer DEFAULT 0,
  p_spotify_plays integer DEFAULT 0
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  current_month TEXT;
BEGIN
  current_month := to_char(now(), 'YYYY-MM');
  
  INSERT INTO public.user_usage (user_id, month_year, voice_interactions, automations_used, documents_processed, spotify_plays)
  VALUES (p_user_id, current_month, p_voice_interactions, p_automations, p_documents, p_spotify_plays)
  ON CONFLICT (user_id, month_year) 
  DO UPDATE SET
    voice_interactions = user_usage.voice_interactions + p_voice_interactions,
    automations_used = user_usage.automations_used + p_automations,
    documents_processed = user_usage.documents_processed + p_documents,
    spotify_plays = user_usage.spotify_plays + p_spotify_plays,
    updated_at = now();
    
  RETURN TRUE;
END;
$function$;

-- Update the get_current_month_usage function to return spotify_plays
CREATE OR REPLACE FUNCTION public.get_current_month_usage(p_user_id uuid)
RETURNS TABLE(voice_interactions integer, automations_used integer, documents_processed integer, spotify_plays integer)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  current_month TEXT;
BEGIN
  current_month := to_char(now(), 'YYYY-MM');
  
  INSERT INTO public.user_usage (user_id, month_year)
  VALUES (p_user_id, current_month)
  ON CONFLICT (user_id, month_year) DO NOTHING;
  
  RETURN QUERY
  SELECT u.voice_interactions, u.automations_used, u.documents_processed, u.spotify_plays
  FROM public.user_usage u
  WHERE u.user_id = p_user_id AND u.month_year = current_month;
END;
$function$;
