-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.admins (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email character varying NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role character varying DEFAULT 'admin'::character varying,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT admins_pkey PRIMARY KEY (id)
);
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
  CONSTRAINT profiles_pkey PRIMARY KEY (id)
);