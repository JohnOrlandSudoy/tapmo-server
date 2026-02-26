-- SQL update script to add new fields for the public profile view
-- Run this script in your Supabase SQL Editor

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS about_text text DEFAULT 'Update your About text'::text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS viber_number character varying DEFAULT 'Update your Viber Number'::character varying;
