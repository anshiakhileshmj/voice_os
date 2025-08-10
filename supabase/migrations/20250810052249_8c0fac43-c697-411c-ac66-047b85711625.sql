
-- Create subscribers table to track subscription information
CREATE TABLE public.subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  razorpay_customer_id TEXT,
  subscribed BOOLEAN NOT NULL DEFAULT false,
  subscription_tier TEXT CHECK (subscription_tier IN ('free', 'starter', 'pro')),
  subscription_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create usage tracking table
CREATE TABLE public.user_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  month_year TEXT NOT NULL, -- Format: YYYY-MM
  voice_interactions INTEGER NOT NULL DEFAULT 0,
  automations_used INTEGER NOT NULL DEFAULT 0,
  documents_processed INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, month_year)
);

-- Enable Row Level Security
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_usage ENABLE ROW LEVEL SECURITY;

-- Create policies for subscribers table
CREATE POLICY "Users can view their own subscription" ON public.subscribers
FOR SELECT USING (user_id = auth.uid() OR email = auth.email());

CREATE POLICY "Users can update their own subscription" ON public.subscribers
FOR UPDATE USING (user_id = auth.uid() OR email = auth.email());

CREATE POLICY "Users can insert their own subscription" ON public.subscribers
FOR INSERT WITH CHECK (user_id = auth.uid());

-- Create policies for user_usage table
CREATE POLICY "Users can view their own usage" ON public.user_usage
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own usage" ON public.user_usage
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own usage" ON public.user_usage
FOR INSERT WITH CHECK (user_id = auth.uid());

-- Function to get or create current month usage
CREATE OR REPLACE FUNCTION get_current_month_usage(p_user_id UUID)
RETURNS TABLE(
  voice_interactions INTEGER,
  automations_used INTEGER,
  documents_processed INTEGER
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  current_month TEXT;
BEGIN
  current_month := to_char(now(), 'YYYY-MM');
  
  INSERT INTO public.user_usage (user_id, month_year)
  VALUES (p_user_id, current_month)
  ON CONFLICT (user_id, month_year) DO NOTHING;
  
  RETURN QUERY
  SELECT u.voice_interactions, u.automations_used, u.documents_processed
  FROM public.user_usage u
  WHERE u.user_id = p_user_id AND u.month_year = current_month;
END;
$$;

-- Function to increment usage counters
CREATE OR REPLACE FUNCTION increment_usage(
  p_user_id UUID,
  p_voice_interactions INTEGER DEFAULT 0,
  p_automations INTEGER DEFAULT 0,
  p_documents INTEGER DEFAULT 0
) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  current_month TEXT;
BEGIN
  current_month := to_char(now(), 'YYYY-MM');
  
  INSERT INTO public.user_usage (user_id, month_year, voice_interactions, automations_used, documents_processed)
  VALUES (p_user_id, current_month, p_voice_interactions, p_automations, p_documents)
  ON CONFLICT (user_id, month_year) 
  DO UPDATE SET
    voice_interactions = user_usage.voice_interactions + p_voice_interactions,
    automations_used = user_usage.automations_used + p_automations,
    documents_processed = user_usage.documents_processed + p_documents,
    updated_at = now();
    
  RETURN TRUE;
END;
$$;
