-- ============================================
-- PEREIRA'S BARBER SHOP - Security hardening
-- Run this in the Supabase SQL Editor before deploying the updated JS.
-- ============================================

-- 1. Explicit admin allow-list.
CREATE TABLE IF NOT EXISTS public.admins (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Current known admin from AGENTS.md. Keep, edit, or add rows as needed.
INSERT INTO public.admins (user_id, email, active)
VALUES ('31187054-1c5d-496d-99a0-387582d50a0a', 'gabrielpantojinho@gmail.com', true)
ON CONFLICT (user_id) DO UPDATE
SET email = EXCLUDED.email,
    active = true;

CREATE OR REPLACE FUNCTION public.is_current_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.admins
        WHERE user_id = auth.uid()
          AND active = true
    );
$$;

REVOKE ALL ON FUNCTION public.is_current_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_current_admin() TO anon, authenticated;

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read admins" ON public.admins;
CREATE POLICY "Admins can read admins" ON public.admins
    FOR SELECT TO authenticated
    USING (public.is_current_admin());

-- 2. Replace broad "any authenticated user is admin" policies.
ALTER TABLE public.barbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read active barbers" ON public.barbers;
DROP POLICY IF EXISTS "Authenticated users can manage barbers" ON public.barbers;
DROP POLICY IF EXISTS "Public can read active services" ON public.services;
DROP POLICY IF EXISTS "Authenticated users can manage services" ON public.services;
DROP POLICY IF EXISTS "Public can create appointments" ON public.appointments;
DROP POLICY IF EXISTS "Public can read appointments" ON public.appointments;
DROP POLICY IF EXISTS "Authenticated users can manage appointments" ON public.appointments;
DROP POLICY IF EXISTS "Authenticated users can delete appointments" ON public.appointments;

CREATE POLICY "Public can read active barbers" ON public.barbers
    FOR SELECT TO anon, authenticated
    USING (active = true OR public.is_current_admin());

CREATE POLICY "Admins can manage barbers" ON public.barbers
    FOR ALL TO authenticated
    USING (public.is_current_admin())
    WITH CHECK (public.is_current_admin());

CREATE POLICY "Public can read active services" ON public.services
    FOR SELECT TO anon, authenticated
    USING (active = true OR public.is_current_admin());

CREATE POLICY "Admins can manage services" ON public.services
    FOR ALL TO authenticated
    USING (public.is_current_admin())
    WITH CHECK (public.is_current_admin());

CREATE POLICY "Admins can manage appointments" ON public.appointments
    FOR ALL TO authenticated
    USING (public.is_current_admin())
    WITH CHECK (public.is_current_admin());

-- 3. Public availability lookup without exposing client names/phones.
CREATE OR REPLACE FUNCTION public.get_public_booked_slots(
    p_barber_id UUID,
    p_appointment_date DATE
)
RETURNS TABLE (
    appointment_time TIME,
    total_duration INTEGER
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT a.appointment_time, a.total_duration
    FROM public.appointments a
    WHERE a.barber_id = p_barber_id
      AND a.appointment_date = p_appointment_date
      AND a.status <> 'cancelled'
    ORDER BY a.appointment_time;
$$;

REVOKE ALL ON FUNCTION public.get_public_booked_slots(UUID, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_booked_slots(UUID, DATE) TO anon, authenticated;

-- 4. Public booking RPC. It calculates price/duration server-side and blocks overlaps.
CREATE OR REPLACE FUNCTION public.create_public_appointment(
    p_barber_id UUID,
    p_service_ids UUID[],
    p_appointment_date DATE,
    p_appointment_time TIME,
    p_client_name TEXT,
    p_client_phone TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_barber public.barbers%ROWTYPE;
    v_service_ids UUID[];
    v_service_names TEXT[];
    v_service_count INTEGER;
    v_total_price NUMERIC(10,2);
    v_total_duration INTEGER;
    v_start_min INTEGER;
    v_end_min INTEGER;
    v_schedule_start_min INTEGER;
    v_schedule_end_min INTEGER;
    v_appointment_id UUID;
BEGIN
    IF p_client_name IS NULL OR length(trim(p_client_name)) < 2 THEN
        RAISE EXCEPTION 'Nome inválido.';
    END IF;

    IF p_client_phone IS NULL OR length(regexp_replace(p_client_phone, '\D', '', 'g')) < 10 THEN
        RAISE EXCEPTION 'WhatsApp inválido.';
    END IF;

    IF p_appointment_date < (timezone('America/Sao_Paulo', now()))::date THEN
        RAISE EXCEPTION 'Data inválida.';
    END IF;

    SELECT *
    INTO v_barber
    FROM public.barbers
    WHERE id = p_barber_id
      AND active = true;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Barbeiro indisponível.';
    END IF;

    IF NOT (extract(dow from p_appointment_date)::int = ANY(v_barber.work_days)) THEN
        RAISE EXCEPTION 'Barbeiro não atende nesta data.';
    END IF;

    WITH selected_services AS (
        SELECT DISTINCT unnest(p_service_ids) AS id
    ),
    active_services AS (
        SELECT s.id, s.name, s.price, s.duration_min, s.sort_order
        FROM public.services s
        JOIN selected_services ss ON ss.id = s.id
        WHERE s.active = true
    )
    SELECT
        array_agg(id ORDER BY sort_order, name),
        array_agg(name ORDER BY sort_order, name),
        count(*),
        COALESCE(sum(price), 0),
        COALESCE(sum(duration_min), 0)
    INTO v_service_ids, v_service_names, v_service_count, v_total_price, v_total_duration
    FROM active_services;

    IF v_service_count IS NULL OR v_service_count = 0 THEN
        RAISE EXCEPTION 'Selecione ao menos um serviço.';
    END IF;

    v_start_min := extract(hour from p_appointment_time)::int * 60 + extract(minute from p_appointment_time)::int;
    v_end_min := v_start_min + v_total_duration;
    v_schedule_start_min := extract(hour from v_barber.schedule_start)::int * 60 + extract(minute from v_barber.schedule_start)::int;
    v_schedule_end_min := extract(hour from v_barber.schedule_end)::int * 60 + extract(minute from v_barber.schedule_end)::int;

    IF v_start_min < v_schedule_start_min OR v_end_min > v_schedule_end_min THEN
        RAISE EXCEPTION 'Horário fora do expediente.';
    END IF;

    PERFORM pg_advisory_xact_lock(hashtextextended(p_barber_id::text || ':' || p_appointment_date::text, 0));

    IF EXISTS (
        SELECT 1
        FROM public.appointments a
        WHERE a.barber_id = p_barber_id
          AND a.appointment_date = p_appointment_date
          AND a.status <> 'cancelled'
          AND (
              (extract(hour from a.appointment_time)::int * 60 + extract(minute from a.appointment_time)::int) < v_end_min
              AND
              (extract(hour from a.appointment_time)::int * 60 + extract(minute from a.appointment_time)::int + a.total_duration) > v_start_min
          )
    ) THEN
        RAISE EXCEPTION 'Horário já ocupado.';
    END IF;

    INSERT INTO public.appointments (
        barber_id,
        service_ids,
        service_names,
        appointment_date,
        appointment_time,
        client_name,
        client_phone,
        status,
        total_price,
        total_duration
    )
    VALUES (
        p_barber_id,
        v_service_ids,
        v_service_names,
        p_appointment_date,
        p_appointment_time,
        trim(p_client_name),
        trim(p_client_phone),
        'confirmed',
        v_total_price,
        v_total_duration
    )
    RETURNING id INTO v_appointment_id;

    RETURN v_appointment_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_public_appointment(UUID, UUID[], DATE, TIME, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_public_appointment(UUID, UUID[], DATE, TIME, TEXT, TEXT) TO anon, authenticated;
