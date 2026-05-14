-- RPC para o Bot Telegram - Agendamentos do Dia
-- Copie TODO o conteúdo e cole no SQL Editor do Supabase

CREATE OR REPLACE FUNCTION public.get_barber_appointments_today(
    IN p_chat_id TEXT,
    IN p_date DATE,
    OUT id UUID,
    OUT appointment_time TIME,
    OUT client_name TEXT,
    OUT client_phone TEXT,
    OUT service_names TEXT[],
    OUT status TEXT,
    OUT total_price NUMERIC,
    OUT total_duration INTEGER,
    OUT barber_name TEXT,
    OUT obs TEXT
)
RETURNS SETOF record
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT a.id, a.appointment_time, a.client_name, a.client_phone,
        a.service_names, a.status, a.total_price, a.total_duration,
        b.name, a.obs
    FROM public.appointments a
    JOIN public.barbers b ON b.id = a.barber_id
    WHERE a.appointment_date = p_date
      AND a.status <> 'cancelled'
      AND (b.telegram_chat_id = p_chat_id
           OR NOT EXISTS (SELECT 1 FROM public.barbers WHERE telegram_chat_id = p_chat_id))
    ORDER BY a.appointment_time;
$$;

REVOKE ALL ON FUNCTION public.get_barber_appointments_today(TEXT, DATE) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_barber_appointments_today(TEXT, DATE) TO anon, authenticated;
