-- Admin authentication and bans update

-- 1) Create admins table
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(50) DEFAULT 'admin',
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2) Ensure profiles has status (active|banned)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';

CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);

-- 3) Seed a default admin (change the hash later)
-- password_hash below is bcrypt hash for: Admin@123
INSERT INTO admins (email, password_hash)
VALUES ('admin@kontactshare.com', '$2a$10$eQBoRZ0e2cB1r2pR4wq0UOt5j6g4fD1cJwQf7k6q9vJ9tCkVJm4z6')
ON CONFLICT (email) DO NOTHING;
