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
      responseText = await getTodayAppointments(chatId);
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
  // Data de hoje no formato YYYY-MM-DD
  const today = new Date().toISOString().split('T')[0];

  try {
    // Buscar agendamentos de hoje para este barbeiro
    const response = await fetch(`${SUPABASE_URL}/rest/v1/appointments`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const appointments = await response.json();

    // Filtrar por data de hoje
    const todayAppointments = appointments.filter(a => a.appointment_date === today);

    if (todayAppointments.length === 0) {
      return `📅 Agendamentos de Hoje (${formatDate(today)})

🎉 Nenhum agendamento para hoje!

Aproveite o dia! 🌟`;
    }

    // Buscar dados dos barbeiros
    const barbersResponse = await fetch(`${SUPABASE_URL}/rest/v1/barbers`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    const barbers = await barbersResponse.json();

    // Filtrar agendamentos deste barbeiro (se ele tiver Chat ID configurado)
    const barber = barbers.find(b => b.telegram_chat_id == chatId);
    const myAppointments = barber
      ? todayAppointments.filter(a => a.barber_id === barber.id)
      : [];

    let responseText = `📅 Agendamentos de Hoje (${formatDate(today)})\n\n`;

    if (myAppointments.length > 0) {
      responseText += `👤 <b>SEUS AGENDAMENTOS:</b>\n\n`;

      myAppointments.forEach((apt, index) => {
        const time = apt.appointment_time ? apt.appointment_time.substring(0, 5) : '--:--';
        const client = apt.client_name || 'Cliente';
        const services = apt.service_names ? apt.service_names.join(', ') : 'N/A';
        const statusEmoji = apt.status === 'confirmed' ? '✅' : apt.status === 'pending' ? '⏳' : '❌';

        responseText += `${index + 1}. ${statusEmoji} <b>${time}</b> - ${client}\n`;
        responseText += `   💇 ${services}\n\n`;
      });
    } else if (barber) {
      responseText += `👤 <b>SEUS AGENDAMENTOS:</b>\n\n`;
      responseText += `🎉 Nenhum agendamento para você hoje!\n\n`;
    }

    // Mostrar todos os agendamentos do dia (se for admin)
    if (!barber) {
      responseText += `👥 <b>TODOS OS AGENDAMENTOS DO DIA:</b>\n\n`;

      todayAppointments.forEach((apt, index) => {
        const time = apt.appointment_time ? apt.appointment_time.substring(0, 5) : '--:--';
        const client = apt.client_name || 'Cliente';
        const barberData = barbers.find(b => b.id === apt.barber_id);
        const barberName = barberData ? barberData.name : 'Barbeiro';
        const services = apt.service_names ? apt.service_names.join(', ') : 'N/A';
        const statusEmoji = apt.status === 'confirmed' ? '✅' : apt.status === 'pending' ? '⏳' : '❌';

        responseText += `${index + 1}. ${statusEmoji} <b>${time}</b> - ${client}\n`;
        responseText += `   💇 ${services} com ${barberName}\n\n`;
      });
    }

    return responseText;
  } catch (error) {
    console.error('Erro ao buscar agendamentos:', error);
    return `❌ Erro ao buscar agendamentos.

Tente novamente mais tarde ou entre em contato com o Gabriel.`;
  }
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