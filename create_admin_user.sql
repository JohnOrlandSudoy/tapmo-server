-- SQL to Create the Admin User with the new email
-- Run this in your Supabase SQL Editor AFTER creating the tables

INSERT INTO public.admins (email, password_hash, role)
VALUES (
  'Tapbosscard@gmail.com', 
  '$2b$10$/bV5wv56175Hv4t7U7My4O8pithJrYUO7qDvCWAtbPIqtRBwZJJly', 
  'admin'
)
ON CONFLICT (email) DO NOTHING;
