-- ============================================
-- PEREIRA'S BARBER SHOP - Schema Supabase
-- Rodar no SQL Editor do Supabase
-- ============================================

-- 1. TABELA DE BARBEIROS
CREATE TABLE IF NOT EXISTS barbers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    schedule_start TIME NOT NULL DEFAULT '09:00',
    schedule_end TIME NOT NULL DEFAULT '19:00',
    work_days INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5,6}',
    active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. TABELA DE SERVICOS
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

-- 3. TABELA DE AGENDAMENTOS
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

-- 4. INDICE PARA BUSCAR AGENDAMENTOS POR DATA/BARBEIRO
CREATE INDEX IF NOT EXISTS idx_appointments_date_barber ON appointments(appointment_date, barber_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE barbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- POLITICAS PARA BARBEIROS
-- Publico pode ler barbeiros ativos (para a pagina de agendamento)
CREATE POLICY "Public can read active barbers" ON barbers
    FOR SELECT USING (active = true);

-- Admins autenticados podem fazer tudo
CREATE POLICY "Authenticated users can manage barbers" ON barbers
    FOR ALL USING (auth.role() = 'authenticated');

-- POLITICAS PARA SERVICOS
-- Publico pode ler servicos ativos
CREATE POLICY "Public can read active services" ON services
    FOR SELECT USING (active = true);

-- Admins autenticados podem fazer tudo
CREATE POLICY "Authenticated users can manage services" ON services
    FOR ALL USING (auth.role() = 'authenticated');

-- POLITICAS PARA AGENDAMENTOS
-- Publico pode criar agendamentos
CREATE POLICY "Public can create appointments" ON appointments
    FOR INSERT WITH CHECK (true);

-- Publico pode ler agendamentos (para verificar horarios ocupados)
CREATE POLICY "Public can read appointments" ON appointments
    FOR SELECT USING (true);

-- Admins autenticados podem atualizar e deletar agendamentos
CREATE POLICY "Authenticated users can manage appointments" ON appointments
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete appointments" ON appointments
    FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================
-- SEED: DADOS INICIAIS
-- ============================================

-- Barbeiros
INSERT INTO barbers (name, schedule_start, schedule_end, work_days, active, sort_order) VALUES
('Rafael', '09:00', '19:00', '{1,2,3,4,5,6}', true, 1),
('Gabriel', '09:00', '19:00', '{1,2,3,4,5,6}', true, 2),
('Marcus Vinicius', '09:00', '19:00', '{1,2,3,4,5,6}', true, 3);

-- Servicos
INSERT INTO services (name, price, duration_min, active, sort_order, featured) VALUES
('Corte (sobrancelha cortesia)', 43.00, 60, true, 1, false),
('Corte + Barbaterapia (sobrancelha cortesia)', 75.00, 80, true, 2, true),
('Barbaterapia (pezinho cortesia)', 43.00, 60, true, 3, false),
('Orelha e Nariz com cera', 25.00, 30, true, 4, false),
('Selagem', 50.00, 60, true, 5, false);

-- ============================================
-- MIGRATION: Adicionar colunas em projetos existentes
-- Rode isto no SQL Editor se as tabelas ja existem
-- ============================================

-- ALTER TABLE services ADD COLUMN IF NOT EXISTS featured BOOLEAN NOT NULL DEFAULT false;
-- ALTER TABLE appointments ADD COLUMN IF NOT EXISTS obs TEXT;
-- UPDATE services SET featured = true WHERE name = 'Corte + Barbaterapia (sobrancelha cortesia)';

-- ============================================
-- 5. TABELA DE FERIADOS
-- ============================================

CREATE TABLE IF NOT EXISTS holidays (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    description TEXT,
    recurring BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read holidays" ON holidays
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage holidays" ON holidays
    FOR ALL USING (auth.role() = 'authenticated');
