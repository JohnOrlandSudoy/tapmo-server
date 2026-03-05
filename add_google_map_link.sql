-- Migration: add google_map_link column to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS google_map_link text;

