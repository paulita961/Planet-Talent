-- 1. Create admin_users table
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid default gen_random_uuid() primary key,
  email text unique not null,
  password text not null
);

-- Insert a default user to login
INSERT INTO admin_users (email, password) 
VALUES ('admin@planettalent.com', 'admin123')
ON CONFLICT (email) DO NOTHING;

-- 2. Create models table
CREATE TABLE IF NOT EXISTS models (
  id serial primary key,
  nombre text not null,
  apellidos text not null,
  instagram text,
  edad integer,
  fecha_nacimiento date,
  ojos text,
  piel text,
  estatura integer,
  busto integer,
  cintura integer,
  caderas integer,
  calzado text,
  photos text[] default '{}'::text[],
  disponible boolean default true,
  destacada boolean default false,
  created_at timestamp with time zone default now()
);

-- 3. Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id serial primary key,
  nombre text not null,
  email text not null,
  telefono text,
  empresa text,
  fecha_evento date not null,
  detalles text not null,
  estado text default 'pendiente', -- 'pendiente', 'aceptado', 'rechazado', 'archivado'
  created_at timestamp with time zone default now()
);

-- 4. Enable Row Level Security (RLS) and Policies for Bookings
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert to bookings" ON bookings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read to bookings" ON bookings
  FOR SELECT USING (true);

CREATE POLICY "Allow public update to bookings" ON bookings
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete to bookings" ON bookings
  FOR DELETE USING (true);

-- 5. Row Level Security for Models (if RLS is enabled on models)
ALTER TABLE models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read to models" ON models
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert to models" ON models
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update to models" ON models
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete to models" ON models
  FOR DELETE USING (true);

-- 6. Supabase Storage Setup for model-photos bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('model-photos', 'model-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow public read from model-photos bucket" ON storage.objects
  FOR SELECT USING (bucket_id = 'model-photos');

CREATE POLICY "Allow public upload to model-photos bucket" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'model-photos');

CREATE POLICY "Allow public update to model-photos bucket" ON storage.objects
  FOR UPDATE USING (bucket_id = 'model-photos');

CREATE POLICY "Allow public delete from model-photos bucket" ON storage.objects
  FOR DELETE USING (bucket_id = 'model-photos');

-- ==============================================================================
-- SCRIPT DE ACTUALIZACIÓN RÁPIDA (Para bases de datos existentes)
-- Ejecutar en Supabase SQL Editor si ya tienes las tablas creadas:
-- ==============================================================================
-- ALTER TABLE models ADD COLUMN IF NOT EXISTS fecha_nacimiento date;
-- ALTER TABLE models ADD COLUMN IF NOT EXISTS disponible boolean default true;
-- ALTER TABLE models ADD COLUMN IF NOT EXISTS destacada boolean default false;
-- ALTER TABLE models ADD COLUMN IF NOT EXISTS created_at timestamp with time zone default now();
-- ALTER TABLE bookings ADD COLUMN IF NOT EXISTS telefono text;
-- INSERT INTO storage.buckets (id, name, public) VALUES ('model-photos', 'model-photos', true) ON CONFLICT (id) DO NOTHING;
