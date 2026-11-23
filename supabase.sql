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

-- 7. Create casting_applications table (17+ años)
CREATE TABLE IF NOT EXISTS casting_applications (
  id serial primary key,
  nombre text not null,
  apellidos text not null,
  fecha_nacimiento date,
  edad integer not null check (edad >= 17),
  ciudad text not null,
  whatsapp text not null,
  correo text not null,
  instagram text not null,
  estatura integer,
  busto integer,
  cintura integer,
  caderas integer,
  talla_superior text,
  talla_inferior text,
  calzado text,
  color_cabello text,
  largo_cabello text,
  color_ojos text,
  tono_piel text,
  tiene_piercings boolean default false,
  tiene_tatuajes boolean default false,
  detalle_piercings_tatuajes text,
  foto_cara text,
  foto_cuerpo text,
  origen text default 'web', -- 'web' | 'google_form'
  nombre_artistico text,
  estado_cabello text,
  tiktok text,
  notas_importacion text,
  datos_incompletos boolean default false,
  campos_faltantes text[],
  estado text default 'pendiente', -- 'pendiente', 'preseleccionada', 'seleccionada', 'descartada'
  created_at timestamp with time zone default now()
);

-- Migración segura si casting_applications ya existía:
ALTER TABLE casting_applications ADD COLUMN IF NOT EXISTS foto_cara text;
ALTER TABLE casting_applications ADD COLUMN IF NOT EXISTS foto_cuerpo text;
ALTER TABLE casting_applications ALTER COLUMN foto_cara DROP NOT NULL;
ALTER TABLE casting_applications ALTER COLUMN foto_cuerpo DROP NOT NULL;

ALTER TABLE casting_applications ADD COLUMN IF NOT EXISTS origen text default 'web';
ALTER TABLE casting_applications ADD COLUMN IF NOT EXISTS nombre_artistico text;
ALTER TABLE casting_applications ADD COLUMN IF NOT EXISTS estado_cabello text;
ALTER TABLE casting_applications ADD COLUMN IF NOT EXISTS tiktok text;
ALTER TABLE casting_applications ADD COLUMN IF NOT EXISTS notas_importacion text;
ALTER TABLE casting_applications ADD COLUMN IF NOT EXISTS datos_incompletos boolean default false;
ALTER TABLE casting_applications ADD COLUMN IF NOT EXISTS campos_faltantes text[];

ALTER TABLE casting_applications ALTER COLUMN fecha_nacimiento DROP NOT NULL;
ALTER TABLE casting_applications ALTER COLUMN estatura DROP NOT NULL;
ALTER TABLE casting_applications ALTER COLUMN talla_superior DROP NOT NULL;
ALTER TABLE casting_applications ALTER COLUMN talla_inferior DROP NOT NULL;
ALTER TABLE casting_applications ALTER COLUMN calzado DROP NOT NULL;
ALTER TABLE casting_applications ALTER COLUMN color_cabello DROP NOT NULL;
ALTER TABLE casting_applications ALTER COLUMN largo_cabello DROP NOT NULL;
ALTER TABLE casting_applications ALTER COLUMN color_ojos DROP NOT NULL;
ALTER TABLE casting_applications ALTER COLUMN tono_piel DROP NOT NULL;

NOTIFY pgrst, 'reload schema';

-- 8. Row Level Security (RLS) for casting_applications:
-- Cualquier visitante solo puede insertar (con edad >= 17); solo el administrador autenticado (Supabase Auth) puede leer, modificar o borrar.
ALTER TABLE casting_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public insert to casting_applications" ON casting_applications;
CREATE POLICY "Allow public insert to casting_applications" ON casting_applications
  FOR INSERT TO anon, authenticated WITH CHECK (edad >= 17);

DROP POLICY IF EXISTS "Allow authenticated admin read on casting_applications" ON casting_applications;
CREATE POLICY "Allow authenticated admin read on casting_applications" ON casting_applications
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated admin update on casting_applications" ON casting_applications;
CREATE POLICY "Allow authenticated admin update on casting_applications" ON casting_applications
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated admin delete on casting_applications" ON casting_applications;
CREATE POLICY "Allow authenticated admin delete on casting_applications" ON casting_applications
  FOR DELETE TO authenticated USING (true);

-- 9. Tabla global para controlar Activo / Pausado y fecha límite de cierre del casting
CREATE TABLE IF NOT EXISTS casting_settings (
  id integer primary key default 1,
  enabled boolean not null default true,
  deadline_iso timestamp with time zone not null default '2026-11-25T23:59:59-05:00',
  updated_at timestamp with time zone default now()
);

INSERT INTO casting_settings (id, enabled, deadline_iso)
VALUES (1, true, '2026-11-25T23:59:59-05:00')
ON CONFLICT (id) DO UPDATE SET deadline_iso = EXCLUDED.deadline_iso;

ALTER TABLE casting_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read casting_settings" ON casting_settings;
CREATE POLICY "Allow public read casting_settings" ON casting_settings
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated admin insert casting_settings" ON casting_settings;
CREATE POLICY "Allow authenticated admin insert casting_settings" ON casting_settings
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated admin update casting_settings" ON casting_settings;
CREATE POLICY "Allow authenticated admin update casting_settings" ON casting_settings
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

