// Vercel Serverless Function para o bot do Telegram
// Rota: /api/telegram
//
// O Telegram envia webhooks para essa função automaticamente 24/7
//
// Comandos disponíveis:
// /start - Responde com o Chat ID do usuário
// /hoje - Mostra agendamentos do dia de hoje
// /agenda - Mostra agendamentos do dia de hoje

const SUPABASE_URL = 'https://mblmmfvibowclskdzzsf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ibG1tZnZpYm93Y2xza2R6enNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MjYyMzIsImV4cCI6MjA5NDIwMjIzMn0.55bfbeJFoaxuqfEFuhZNMJHoVt-wGPpg2D3SVWUX9So';
const TELEGRAM_BOT_TOKEN = '8932305524:AAE4CBvVQb-lMG4lnE57WVRKr7Pdwteewds';

export default async function handler(req, res) {
  // Apenas POST do Telegram
  if (req.method !== 'POST') {
    return res.status(200).json({ ok: true, message: 'Telegram webhook endpoint' });
  }

  try {
    const update = req.body;

    // Verificar se é mensagem
    if (!update.message) {
      return res.status(200).json({ ok: true });
    }

    const message = update.message;
    const chat = message.chat;
    const from = message.from;
    const text = message.text;

    if (!chat || !text) {
      return res.status(200).json({ ok: true });
    }

    const chatId = chat.id;
    const firstName = from.first_name || 'Visitante';
    const command = text.toLowerCase().trim();

    // Processar comandos
    let responseText = '';

    if (command === '/start' || command === 'oi' || command === 'ola') {
      // Enviar Chat ID
      responseText = `👋 Oi, ${firstName}!

📱 Seu <b>Chat ID</b> é: <code>${chatId}</code>

💡 Copie este número e envie para o Gabriel configurar!

📍 Link do site: https://pereira-barbershop.vercel.app/agendar.html`;
    } else if (command === '/hoje' || command === '/agenda' || command === '/agendamentos') {
      // Buscar agendamentos de hoje
      responseText = await getTodayAppointments(String(chatId));
    } else {
      // Mensagem não reconhecida
      responseText = `👋 Oi, ${firstName}!

📝 Comandos disponíveis:
• <b>/start</b> - Ver seu Chat ID
• <b>/hoje</b> - Ver agendamentos de hoje

📍 Site: https://pereira-barbershop.vercel.app`;
    }

    // Enviar resposta
    const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const telegramResponse = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: responseText,
        parse_mode: 'HTML'
      })
    });

    const telegramData = await telegramResponse.json();

    return res.status(200).json({ ok: true, telegram: telegramData });

  } catch (error) {
    console.error('Erro no webhook:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
}

async function getTodayAppointments(chatId) {
  // Data de hoje no formato YYYY-MM-DD (timezone Brazil/Sao_Paulo)
  const now = new Date();
  const brazilOffset = -3 * 60; // GMT-3
  const utcMs = now.getTime() + (now.getTimezoneOffset() * 60000);
  const brazilDate = new Date(utcMs + (brazilOffset * 60000));
  const today = brazilDate.toISOString().split('T')[0];

  try {
    // 1. Buscar barbeiros
    const barbersResponse = await fetch(`${SUPABASE_URL}/rest/v1/barbers?select=*`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    const barbers = await barbersResponse.json();

    // 2. Verificar se o chatId pertence a um barbeiro
    const barber = barbers.find(b => String(b.telegram_chat_id) === String(chatId));

    // 3. Buscar agendamentos usando RPC (bypassa RLS via SECURITY DEFINER)
    //    Usa o novo RPC get_barber_appointments_today se disponível
    //    Senão faz fallback via get_public_booked_slots por barbeiro
    let appointments = [];

    // Tentar o RPC novo primeiro (com dados completos)
    try {
      const rpcResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_barber_appointments_today`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          p_chat_id: String(chatId),
          p_date: today
        })
      });
      const rpcData = await rpcResponse.json();

      if (Array.isArray(rpcData) && rpcData.length >= 0 && !rpcData.code) {
        // RPC novo funcionou - retorna dados completos
        appointments = rpcData.map(apt => ({
          id: apt.id,
          appointment_time: apt.appointment_time,
          client_name: apt.client_name,
          client_phone: apt.client_phone,
          service_names: apt.service_names,
          status: apt.status,
          total_price: apt.total_price,
          total_duration: apt.total_duration,
          barber_name: apt.barber_name,
          obs: apt.obs
        }));
      } else {
        // RPC novo não existe ainda - usar fallback com get_public_booked_slots
        appointments = await getAppointmentsFallback(barber, barbers, today);
      }
    } catch (e) {
      // RPC novo não existe - usar fallback
      appointments = await getAppointmentsFallback(barber, barbers, today);
    }

    if (!appointments || appointments.length === 0) {
      return `📅 Agendamentos de Hoje (${formatDate(today)})

🎉 Nenhum agendamento para hoje!

Aproveite o dia! 🌟`;
    }

    // Montar resposta
    let responseText = `📅 Agendamentos de Hoje (${formatDate(today)})\n\n`;

    // Separar: se é barbeiro, mostra só os dele com header pessoal
    if (barber) {
      responseText += `👤 <b>SEUS AGENDAMENTOS:</b>\n\n`;

      appointments.forEach((apt, index) => {
        const time = apt.appointment_time ? String(apt.appointment_time).substring(0, 5) : '--:--';
        const client = apt.client_name || 'Cliente';
        const services = apt.service_names
          ? (Array.isArray(apt.service_names) ? apt.service_names.join(', ') : String(apt.service_names))
          : 'N/A';
        const statusEmoji = apt.status === 'confirmed' ? '✅' : apt.status === 'pending' ? '⏳' : '❌';
        const price = apt.total_price ? ` — R$ ${Number(apt.total_price).toFixed(2).replace('.', ',')}` : '';

        responseText += `${index + 1}. ${statusEmoji} <b>${time}</b> - ${client}\n`;
        responseText += `   💇 ${services}${price}\n`;
        if (apt.obs) {
          responseText += `   📝 ${apt.obs}\n`;
        }
        responseText += '\n';
      });

      responseText += `📊 Total: ${appointments.length} agendamento(s)`;
    } else {
      // Não é barbeiro - mostrar todos
      responseText += `👥 <b>TODOS OS AGENDAMENTOS DO DIA:</b>\n\n`;

      appointments.forEach((apt, index) => {
        const time = apt.appointment_time ? String(apt.appointment_time).substring(0, 5) : '--:--';
        const client = apt.client_name || 'Cliente';
        const barberName = apt.barber_name || 'Barbeiro';
        const services = apt.service_names
          ? (Array.isArray(apt.service_names) ? apt.service_names.join(', ') : String(apt.service_names))
          : 'N/A';
        const statusEmoji = apt.status === 'confirmed' ? '✅' : apt.status === 'pending' ? '⏳' : '❌';

        responseText += `${index + 1}. ${statusEmoji} <b>${time}</b> - ${client}\n`;
        responseText += `   💇 ${services} com ${barberName}\n\n`;
      });

      responseText += `📊 Total: ${appointments.length} agendamento(s)`;
    }

    return responseText;
  } catch (error) {
    console.error('Erro ao buscar agendamentos:', error);
    return `❌ Erro ao buscar agendamentos.

Tente novamente mais tarde ou entre em contato com o Gabriel.`;
  }
}

// Fallback: usa get_public_booked_slots (que funciona via SECURITY DEFINER)
// e enriquece com dados dos barbeiros
async function getAppointmentsFallback(barber, barbers, today) {
  // Se é um barbeiro, buscar slots dele
  // Se não é barbeiro, buscar slots de todos
  const targetBarbers = barber ? [barber] : barbers.filter(b => b.active);
  let allSlots = [];

  for (const b of targetBarbers) {
    try {
      const slotsResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_public_booked_slots`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          p_barber_id: b.id,
          p_appointment_date: today
        })
      });
      const slots = await slotsResponse.json();

      if (Array.isArray(slots)) {
        const enriched = slots.map(s => ({
          appointment_time: s.appointment_time,
          total_duration: s.total_duration,
          barber_name: b.name,
          client_name: 'Cliente',
          service_names: null,
          status: 'confirmed'
        }));
        allSlots = allSlots.concat(enriched);
      }
    } catch (e) {
      console.error(`Erro ao buscar slots do barbeiro ${b.name}:`, e);
    }
  }

  // Ordenar por hora
  allSlots.sort((a, b) => String(a.appointment_time).localeCompare(String(b.appointment_time)));
  return allSlots;
}

function formatDate(dateStr) {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}
