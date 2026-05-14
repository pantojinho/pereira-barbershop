-- ============================================
-- RPC para o Bot Telegram - Agendamentos do Dia
-- Rodar no SQL Editor do Supabase (https://supabase.com/dashboard)
-- ============================================

-- Remove versão anterior se existir
DROP FUNCTION IF EXISTS public.get_barber_appointments_today(TEXT, DATE);

-- Cria o RPC que retorna agendamentos completos bypassando RLS
CREATE OR REPLACE FUNCTION public.get_barber_appointments_today(
    p_barber_telegram_chat_id TEXT,
    p_appointment_date DATE
)
RETURNS TABLE (
    id UUID,
    appointment_time TIME,
    client_name TEXT,
    client_phone TEXT,
    service_names TEXT[],
    status TEXT,
    total_price NUMERIC,
    total_duration INTEGER,
    barber_name TEXT,
    obs TEXT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        a.id,
        a.appointment_time,
        a.client_name,
        a.client_phone,
        a.service_names,
        a.status,
        a.total_price,
        a.total_duration,
        b.name AS barber_name,
        a.obs
    FROM public.appointments a
    JOIN public.barbers b ON b.id = a.barber_id
    WHERE a.appointment_date = p_appointment_date
      AND a.status <> 'cancelled'
      AND (
          -- Se o chat_id bater com um barbeiro, retorna só os dele
          b.telegram_chat_id = p_barber_telegram_chat_id
          OR
          -- Se não bater nenhum barbeiro, retorna todos (admin/visitante)
          NOT EXISTS (SELECT 1 FROM public.barbers WHERE telegram_chat_id = p_barber_telegram_chat_id)
      )
    ORDER BY a.appointment_time;
$$;

-- Permite acesso anônimo e autenticado
REVOKE ALL ON FUNCTION public.get_barber_appointments_today(TEXT, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_barber_appointments_today(TEXT, DATE) TO anon, authenticated;
