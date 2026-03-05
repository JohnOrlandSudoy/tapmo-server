-- SQL to Create the Admin User with the new email
-- Run this in your Supabase SQL Editor AFTER creating the tables

INSERT INTO public.admins (email, password_hash, role)
VALUES (
  'Tapbosscard@gmail.com', 
  '$2b$10$Xfb5gtoU5ld4EqHFicQkruGVjcoahHt2n5bV5HxMjApfxzlCL0bGq', 
  'admin'
)
ON CONFLICT (email) DO NOTHING;
