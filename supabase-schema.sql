-- ============================================
-- PEREIRA'S BARBER SHOP - Schema Completo
-- Rodar no SQL Editor do Supabase (idempotente)
-- ============================================

-- 1. TABELA DE BARBEIROS
CREATE TABLE IF NOT EXISTS barbers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    works_holidays BOOLEAN NOT NULL DEFAULT false,
    photo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. TABELA DE HORARIOS POR DIA
CREATE TABLE IF NOT EXISTS barber_schedules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barber_id UUID NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TIME NOT NULL DEFAULT '09:00',
    end_time TIME NOT NULL DEFAULT '19:00',
    UNIQUE(barber_id, day_of_week)
);

-- 3. TABELA DE SERVICOS
CREATE TABLE IF NOT EXISTS services (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    duration_min INTEGER NOT NULL,
    featured BOOLEAN NOT NULL DEFAULT false,
    active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. TABELA DE AGENDAMENTOS
CREATE TABLE IF NOT EXISTS appointments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barber_id UUID NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
    service_ids UUID[] NOT NULL,
    service_names TEXT[] NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    client_name TEXT NOT NULL,
    client_phone TEXT NOT NULL,
    obs TEXT,
    status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    total_price NUMERIC(10,2) NOT NULL DEFAULT 0,
    total_duration INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. TABELA DE FERIADOS
CREATE TABLE IF NOT EXISTS holidays (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    description TEXT,
    recurring BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. TABELA DE PRODUTOS
CREATE TABLE IF NOT EXISTS products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10,2) NOT NULL,
    photo_url TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. TABELA DE PEDIDOS/RESERVAS DE PRODUTOS
CREATE TABLE IF NOT EXISTS product_orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_ids UUID[] NOT NULL,
    product_names TEXT[] NOT NULL,
    product_prices NUMERIC(10,2)[] NOT NULL,
    quantities INTEGER[] NOT NULL,
    client_name TEXT NOT NULL,
    client_phone TEXT NOT NULL,
    total_price NUMERIC(10,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved', 'picked_up', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. INDICES
CREATE INDEX IF NOT EXISTS idx_appointments_date_barber ON appointments(appointment_date, barber_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_barber_schedules_barber ON barber_schedules(barber_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(active, sort_order);
CREATE INDEX IF NOT EXISTS idx_product_orders_status ON product_orders(status);

-- ============================================
-- ROW LEVEL SECURITY (basico)
-- Depois rodar supabase-security-hardening.sql para reforcar
-- ============================================

ALTER TABLE barbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE barber_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_orders ENABLE ROW LEVEL SECURITY;

-- BARBEIROS
DROP POLICY IF EXISTS "Public can read active barbers" ON barbers;
CREATE POLICY "Public can read active barbers" ON barbers
    FOR SELECT USING (active = true);

DROP POLICY IF EXISTS "Authenticated users can manage barbers" ON barbers;
CREATE POLICY "Authenticated users can manage barbers" ON barbers
    FOR ALL USING (auth.role() = 'authenticated');

-- BARBER SCHEDULES
DROP POLICY IF EXISTS "Public can read barber schedules" ON barber_schedules;
CREATE POLICY "Public can read barber schedules" ON barber_schedules
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage barber schedules" ON barber_schedules;
CREATE POLICY "Authenticated users can manage barber schedules" ON barber_schedules
    FOR ALL USING (auth.role() = 'authenticated');

-- SERVICOS
DROP POLICY IF EXISTS "Public can read active services" ON services;
CREATE POLICY "Public can read active services" ON services
    FOR SELECT USING (active = true);

DROP POLICY IF EXISTS "Authenticated users can manage services" ON services;
CREATE POLICY "Authenticated users can manage services" ON services
    FOR ALL USING (auth.role() = 'authenticated');

-- AGENDAMENTOS
DROP POLICY IF EXISTS "Public can create appointments" ON appointments;
CREATE POLICY "Public can create appointments" ON appointments
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public can read appointments" ON appointments;
CREATE POLICY "Public can read appointments" ON appointments
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage appointments" ON appointments;
CREATE POLICY "Authenticated users can manage appointments" ON appointments
    FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can delete appointments" ON appointments;
CREATE POLICY "Authenticated users can delete appointments" ON appointments
    FOR DELETE USING (auth.role() = 'authenticated');

-- FERIADOS
DROP POLICY IF EXISTS "Public can read holidays" ON holidays;
CREATE POLICY "Public can read holidays" ON holidays
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage holidays" ON holidays;
CREATE POLICY "Authenticated users can manage holidays" ON holidays
    FOR ALL USING (auth.role() = 'authenticated');

-- PRODUTOS
DROP POLICY IF EXISTS "Public can read active products" ON products;
CREATE POLICY "Public can read active products" ON products
    FOR SELECT USING (active = true);

DROP POLICY IF EXISTS "Authenticated users can manage products" ON products;
CREATE POLICY "Authenticated users can manage products" ON products
    FOR ALL USING (auth.role() = 'authenticated');

-- PEDIDOS DE PRODUTOS
DROP POLICY IF EXISTS "Public can create product orders" ON product_orders;
CREATE POLICY "Public can create product orders" ON product_orders
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can manage product orders" ON product_orders;
CREATE POLICY "Authenticated users can manage product orders" ON product_orders
    FOR ALL USING (auth.role() = 'authenticated');
-- ============================================

INSERT INTO barbers (name, active, sort_order, works_holidays)
SELECT name, true, sort_order, false FROM (VALUES
    ('Rafael', 1),
    ('Gabriel', 2),
    ('Marcus Vinicius', 3)
) AS v(name, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM barbers WHERE barbers.name = v.name);

INSERT INTO barber_schedules (barber_id, day_of_week, start_time, end_time)
SELECT b.id, d.day, '09:00', '19:00'
FROM barbers b
CROSS JOIN (SELECT generate_series(1,6) AS day) d
WHERE b.name IN ('Rafael', 'Gabriel', 'Marcus Vinicius')
  AND NOT EXISTS (
      SELECT 1 FROM barber_schedules bs
      WHERE bs.barber_id = b.id AND bs.day_of_week = d.day
  );

INSERT INTO services (name, price, duration_min, active, sort_order, featured)
SELECT name, price, duration_min, true, sort_order, featured FROM (VALUES
    ('Corte (sobrancelha cortesia)', 43.00, 60, 1, false),
    ('Corte + Barbaterapia (sobrancelha cortesia)', 75.00, 80, 2, true),
    ('Barbaterapia (pezinho cortesia)', 43.00, 60, 3, false),
    ('Orelha e Nariz com cera', 25.00, 30, 4, false),
    ('Selagem', 50.00, 60, 5, false)
) AS v(name, price, duration_min, sort_order, featured)
WHERE NOT EXISTS (SELECT 1 FROM services WHERE services.name = v.name);

-- ============================================
-- STORAGE: Bucket para fotos dos barbeiros
-- ============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('barber-photos', 'barber-photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public can view barber photos" ON storage.objects;
CREATE POLICY "Public can view barber photos" ON storage.objects
    FOR SELECT USING (bucket_id = 'barber-photos');

DROP POLICY IF EXISTS "Authenticated can upload barber photos" ON storage.objects;
CREATE POLICY "Authenticated can upload barber photos" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'barber-photos' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated can update barber photos" ON storage.objects;
CREATE POLICY "Authenticated can update barber photos" ON storage.objects
    FOR UPDATE USING (bucket_id = 'barber-photos' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated can delete barber photos" ON storage.objects;
CREATE POLICY "Authenticated can delete barber photos" ON storage.objects
    FOR DELETE USING (bucket_id = 'barber-photos' AND auth.role() = 'authenticated');

-- ============================================
-- STORAGE: Bucket para fotos dos produtos
-- ============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('product-photos', 'product-photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public can view product photos" ON storage.objects;
CREATE POLICY "Public can view product photos" ON storage.objects
    FOR SELECT USING (bucket_id = 'product-photos');

DROP POLICY IF EXISTS "Authenticated can upload product photos" ON storage.objects;
CREATE POLICY "Authenticated can upload product photos" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'product-photos' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated can update product photos" ON storage.objects;
CREATE POLICY "Authenticated can update product photos" ON storage.objects
    FOR UPDATE USING (bucket_id = 'product-photos' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated can delete product photos" ON storage.objects;
CREATE POLICY "Authenticated can delete product photos" ON storage.objects
    FOR DELETE USING (bucket_id = 'product-photos' AND auth.role() = 'authenticated');
