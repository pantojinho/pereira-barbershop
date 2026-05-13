-- ============================================
-- PEREIRA'S BARBER SHOP - Schema Supabase
-- Rodar no SQL Editor do Supabase
-- ============================================

-- 1. TABELA DE BARBEIROS
CREATE TABLE IF NOT EXISTS barbers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    works_holidays BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. TABELA DE HORARIOS POR DIA (cada barbeiro pode ter horario diferente por dia)
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

-- 6. INDICES
CREATE INDEX IF NOT EXISTS idx_appointments_date_barber ON appointments(appointment_date, barber_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_barber_schedules_barber ON barber_schedules(barber_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE barbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE barber_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;

-- BARBEIROS
CREATE POLICY "Public can read active barbers" ON barbers
    FOR SELECT USING (active = true);

CREATE POLICY "Authenticated users can manage barbers" ON barbers
    FOR ALL USING (auth.role() = 'authenticated');

-- BARBER SCHEDULES (publico le para agendamento)
CREATE POLICY "Public can read barber schedules" ON barber_schedules
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage barber schedules" ON barber_schedules
    FOR ALL USING (auth.role() = 'authenticated');

-- SERVICOS
CREATE POLICY "Public can read active services" ON services
    FOR SELECT USING (active = true);

CREATE POLICY "Authenticated users can manage services" ON services
    FOR ALL USING (auth.role() = 'authenticated');

-- AGENDAMENTOS
CREATE POLICY "Public can create appointments" ON appointments
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can read appointments" ON appointments
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage appointments" ON appointments
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete appointments" ON appointments
    FOR DELETE USING (auth.role() = 'authenticated');

-- FERIADOS
CREATE POLICY "Public can read holidays" ON holidays
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage holidays" ON holidays
    FOR ALL USING (auth.role() = 'authenticated');

-- ============================================
-- SEED: DADOS INICIAIS
-- ============================================

-- Barbeiros
INSERT INTO barbers (name, active, sort_order, works_holidays) VALUES
('Rafael', true, 1, false),
('Gabriel', true, 2, false),
('Marcus Vinicius', true, 3, false);

-- Horarios (Seg=1, Ter=2, Qua=3, Qui=4, Sex=5, Sab=6)
INSERT INTO barber_schedules (barber_id, day_of_week, start_time, end_time)
SELECT b.id, d.day, '09:00', '19:00'
FROM barbers b
CROSS JOIN (SELECT generate_series(1,6) AS day) d
WHERE b.name IN ('Rafael', 'Gabriel', 'Marcus Vinicius');

-- Servicos
INSERT INTO services (name, price, duration_min, active, sort_order, featured) VALUES
('Corte (sobrancelha cortesia)', 43.00, 60, true, 1, false),
('Corte + Barbaterapia (sobrancelha cortesia)', 75.00, 80, true, 2, true),
('Barbaterapia (pezinho cortesia)', 43.00, 60, true, 3, false),
('Orelha e Nariz com cera', 25.00, 30, true, 4, false),
('Selagem', 50.00, 60, true, 5, false);

-- ============================================
-- MIGRATION: Para projetos que ja tinham as tabelas antigas
-- Rode isto no SQL Editor se esta atualizando um projeto existente
-- ============================================

-- 1. Adicionar works_holidays na tabela barbers
-- ALTER TABLE barbers ADD COLUMN IF NOT EXISTS works_holidays BOOLEAN NOT NULL DEFAULT false;

-- 2. Criar tabela barber_schedules e popular com dados antigos
/*
CREATE TABLE IF NOT EXISTS barber_schedules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barber_id UUID NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TIME NOT NULL DEFAULT '09:00',
    end_time TIME NOT NULL DEFAULT '19:00',
    UNIQUE(barber_id, day_of_week)
);

ALTER TABLE barber_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read barber schedules" ON barber_schedules
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage barber schedules" ON barber_schedules
    FOR ALL USING (auth.role() = 'authenticated');

-- Migrar dados antigos (schedule_start/schedule_end/work_days -> barber_schedules)
INSERT INTO barber_schedules (barber_id, day_of_week, start_time, end_time)
SELECT b.id, unnest(b.work_days) AS day, b.schedule_start, b.schedule_end
FROM barbers b
WHERE b.work_days IS NOT NULL AND array_length(b.work_days, 1) > 0
ON CONFLICT (barber_id, day_of_week) DO NOTHING;

-- Colunas antigas podem ser removidas depois (opcional)
-- ALTER TABLE barbers DROP COLUMN IF EXISTS schedule_start;
-- ALTER TABLE barbers DROP COLUMN IF EXISTS schedule_end;
-- ALTER TABLE barbers DROP COLUMN IF EXISTS work_days;
*/
