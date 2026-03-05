CREATE TABLE IF NOT EXISTS public.profile_gallery (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_unique_code text REFERENCES public.profiles(unique_code) ON DELETE CASCADE,
    image_url text NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profile_gallery_unique_code ON public.profile_gallery(profile_unique_code);
