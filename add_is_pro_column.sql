-- Add is_pro column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_pro BOOLEAN DEFAULT FALSE;

-- Update existing profiles (optional, default is false anyway)
UPDATE public.profiles SET is_pro = FALSE WHERE is_pro IS NULL;
