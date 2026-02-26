-- SQL script to update Supabase schema
-- Run this in your Supabase SQL Editor

-- Add 'about_text' column if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS about_text text DEFAULT 'Update your About';

-- Add 'viber_number' column if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS viber_number character varying DEFAULT 'Update your Viber Number';

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('about_text', 'viber_number');
