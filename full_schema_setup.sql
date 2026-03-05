-- Full Database Schema for New Supabase Project

-- 1. Create Admins Table
CREATE TABLE IF NOT EXISTS public.admins (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email character varying NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role character varying DEFAULT 'admin'::character varying,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT admins_pkey PRIMARY KEY (id)
);

-- 2. Create Profiles Table (Create this before profile_gallery because of Foreign Key)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  admin_id character varying NOT NULL UNIQUE,
  pin character varying NOT NULL,
  unique_code character varying NOT NULL UNIQUE,
  profile_photo_url text,
  full_name character varying DEFAULT 'Default Name'::character varying,
  email character varying DEFAULT 'default@example.com'::character varying,
  job_title character varying DEFAULT 'Default Job'::character varying,
  company_name character varying DEFAULT 'Default Company'::character varying,
  mobile_primary character varying DEFAULT '123-456-7890'::character varying,
  landline_number character varying DEFAULT '238490-9083287'::character varying,
  address text DEFAULT 'Default Address'::text,
  facebook_link text DEFAULT 'Update your Facebook Link'::text,
  instagram_link text DEFAULT 'Update your Instagram Link'::text,
  tiktok_link text DEFAULT 'Update your TikTok Link'::text,
  whatsapp_number character varying DEFAULT 'Update your WhatsApp Number'::character varying,
  website_link text DEFAULT 'Update your web link'::text,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  status character varying DEFAULT 'active'::character varying,
  about_text text DEFAULT 'Update your About'::text,
  viber_number character varying DEFAULT 'Update your Viber Number'::character varying,
  branch_name character varying DEFAULT 'Update your Branch'::character varying,
  location character varying DEFAULT 'Default Location'::character varying,
  logo_url text,
  is_pro boolean DEFAULT false,
  theme_color text,
  CONSTRAINT profiles_pkey PRIMARY KEY (id)
);

-- 3. Create Profile Gallery Table
CREATE TABLE IF NOT EXISTS public.profile_gallery (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  profile_unique_code text,
  image_url text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profile_gallery_pkey PRIMARY KEY (id),
  CONSTRAINT profile_gallery_profile_unique_code_fkey FOREIGN KEY (profile_unique_code) REFERENCES public.profiles(unique_code)
);

-- 4. Enable Row Level Security (Recommended)
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_gallery ENABLE ROW LEVEL SECURITY;

-- 5. Create Policies for Tables
-- Allow public read access to active profiles
CREATE POLICY "Public can view active profiles" ON public.profiles FOR SELECT USING (true);
-- Allow public read access to gallery
CREATE POLICY "Public can view gallery" ON public.profile_gallery FOR SELECT USING (true);
-- Allow admins full access (if using Service Role Key, this is bypassed, but good for Client-side Auth)
-- For now, we rely on Service Role Key for Admin operations from the Server.

-- 6. Storage Setup (Create Bucket and Policies)
-- Note: You might need to run this part separately if your user lacks permissions to modify storage schema directly via SQL Editor.
-- Best practice is to create the bucket 'public-uploads' via Supabase Dashboard -> Storage -> New Bucket (Public).

-- Policies for 'public-uploads' bucket
-- Allow public read access
create policy "Public Access"
on storage.objects for select
to public
using ( bucket_id = 'public-uploads' );

-- Allow public upload access (needed if using Anon Key, bypassed if using Service Role Key)
create policy "Public Upload"
on storage.objects for insert
to public
with check ( bucket_id = 'public-uploads' );

-- Allow public update access
create policy "Public Update"
on storage.objects for update
to public
using ( bucket_id = 'public-uploads' );

-- Allow public delete access
create policy "Public Delete"
on storage.objects for delete
to public
using ( bucket_id = 'public-uploads' );

-- 7. Create Admin User
INSERT INTO public.admins (email, password_hash, role)
VALUES (
  'Tapbosscard@gmail.com', 
  '$2b$10$Xfb5gtoU5ld4EqHFicQkruGVjcoahHt2n5bV5HxMjApfxzlCL0bGq', 
  'admin'
)
ON CONFLICT (email) DO NOTHING;
