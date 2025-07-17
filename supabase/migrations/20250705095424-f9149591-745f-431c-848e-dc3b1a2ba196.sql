-- Add name field to profiles table
ALTER TABLE public.profiles ADD COLUMN name TEXT;

-- Create user_history table
CREATE TABLE public.user_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  message TEXT NOT NULL,
  intent TEXT,
  response TEXT,
  location_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create document_uploads table
CREATE TABLE public.document_uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  file_content TEXT,
  processed_content TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create document_interactions table  
CREATE TABLE public.document_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES public.document_uploads ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add last_greeted_at to profiles
ALTER TABLE public.profiles ADD COLUMN last_greeted_at TIMESTAMP WITH TIME ZONE;

-- Enable RLS on new tables
ALTER TABLE public.user_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_interactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_history
CREATE POLICY "Users can view their own history" 
  ON public.user_history 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own history" 
  ON public.user_history 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- RLS policies for document_uploads
CREATE POLICY "Users can view their own documents" 
  ON public.document_uploads 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upload their own documents" 
  ON public.document_uploads 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents" 
  ON public.document_uploads 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents" 
  ON public.document_uploads 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- RLS policies for document_interactions
CREATE POLICY "Users can view their own document interactions" 
  ON public.document_interactions 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own document interactions" 
  ON public.document_interactions 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Function to clean up old history (30 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_history()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.user_history WHERE created_at < NOW() - INTERVAL '30 days';
  DELETE FROM public.document_interactions WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$;