-- Full Database Schema for New Supabase Project

-- 1. Create Admins Table
CREATE TABLE public.admins (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email character varying NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role character varying DEFAULT 'admin'::character varying,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT admins_pkey PRIMARY KEY (id)
);

-- 2. Create Profiles Table (Create this before profile_gallery because of Foreign Key)
CREATE TABLE public.profiles (
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
CREATE TABLE public.profile_gallery (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  profile_unique_code text,
  image_url text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profile_gallery_pkey PRIMARY KEY (id),
  CONSTRAINT profile_gallery_profile_unique_code_fkey FOREIGN KEY (profile_unique_code) REFERENCES public.profiles(unique_code)
);

-- 4. Enable Row Level Security (Optional but Recommended)
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_gallery ENABLE ROW LEVEL SECURITY;

-- 5. Create Policies (Open Access for now based on your screenshot showing RLS disabled, but good to have ready)
-- Allow public read access to active profiles
CREATE POLICY "Public can view active profiles" ON public.profiles FOR SELECT USING (true);
-- Allow public read access to gallery
CREATE POLICY "Public can view gallery" ON public.profile_gallery FOR SELECT USING (true);

-- NOTE: Since you are managing everything via a server using a Service Role Key or direct connection, 
-- RLS policies might not be strictly needed if you disable RLS or use the service role key.
-- However, if you use the client-side Supabase client, you will need these policies.
