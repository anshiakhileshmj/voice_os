
-- Create table to store Spotify user profiles and data
CREATE TABLE public.spotify_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  spotify_user_id TEXT NOT NULL UNIQUE,
  display_name TEXT,
  email TEXT,
  country TEXT,
  product TEXT, -- 'free' or 'premium'
  followers_count INTEGER DEFAULT 0,
  profile_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table to store user's playlists
CREATE TABLE public.spotify_playlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  spotify_playlist_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  track_count INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT false,
  is_collaborative BOOLEAN DEFAULT false,
  owner_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, spotify_playlist_id)
);

-- Create table to store user's top artists
CREATE TABLE public.spotify_artists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  spotify_artist_id TEXT NOT NULL,
  name TEXT NOT NULL,
  genres JSONB DEFAULT '[]',
  popularity INTEGER DEFAULT 0,
  followers_count INTEGER DEFAULT 0,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, spotify_artist_id)
);

-- Create table to store user's top tracks
CREATE TABLE public.spotify_tracks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  spotify_track_id TEXT NOT NULL,
  name TEXT NOT NULL,
  artist_names TEXT NOT NULL,
  album_name TEXT,
  duration_ms INTEGER,
  popularity INTEGER DEFAULT 0,
  preview_url TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, spotify_track_id)
);

-- Add Row Level Security (RLS) policies
ALTER TABLE public.spotify_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spotify_playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spotify_artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spotify_tracks ENABLE ROW LEVEL SECURITY;

-- Spotify profiles policies
CREATE POLICY "Users can view their own spotify profile" 
  ON public.spotify_profiles 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own spotify profile" 
  ON public.spotify_profiles 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own spotify profile" 
  ON public.spotify_profiles 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Playlists policies
CREATE POLICY "Users can view their own spotify playlists" 
  ON public.spotify_playlists 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own spotify playlists" 
  ON public.spotify_playlists 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own spotify playlists" 
  ON public.spotify_playlists 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Artists policies
CREATE POLICY "Users can view their own spotify artists" 
  ON public.spotify_artists 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own spotify artists" 
  ON public.spotify_artists 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Tracks policies
CREATE POLICY "Users can view their own spotify tracks" 
  ON public.spotify_tracks 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own spotify tracks" 
  ON public.spotify_tracks 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);
