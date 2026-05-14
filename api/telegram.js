/**
 * @file api/telegram.js
 * @description Vercel Serverless Function — Telegram Bot Webhook Handler
 *
 * This module acts as the backend for the @PereiraBarbershop_bot Telegram bot.
 * Telegram sends POST webhooks to this endpoint whenever a user interacts with
 * the bot (e.g., sends a message or command). Vercel auto-deploys this file
 * from the GitHub main branch and routes it at `/api/telegram`.
 *
 * === Supported Commands ===
 *   /start           — Welcomes the user and returns their Telegram Chat ID
 *                       (needed for the admin to link them as a barber in Supabase).
 *   /hoje            — Fetches and displays today's appointments for the requesting user.
 *   /agenda          — Alias for /hoje.
 *   /agendamentos    — Alias for /hoje.
 *   "oi", "ola"      — Alias for /start (casual greeting triggers welcome message).
 *
 * === Architecture Overview ===
 *   Telegram Bot → POST webhook → Vercel Serverless Function (this file)
 *       → Parse command
 *       → Query Supabase (PostgREST + RPC) for appointment data
 *       → Format response with HTML parse_mode
 *       → POST back to Telegram Bot API sendMessage endpoint
 *
 * === Authentication Model ===
 *   - Supabase uses the anon key (public) for all queries.
 *   - Row Level Security (RLS) is bypassed via SECURITY DEFINER RPC functions.
 *   - The bot identifies barbers by matching `telegram_chat_id` in the `barbers` table.
 *   - If the sender is a recognized barber → shows only their appointments.
 *   - If the sender is NOT a barber → shows ALL appointments (admin/owner view).
 *
 * === Data Retrieval — RPC Fallback Chain ===
 *   1. Primary: `get_barber_appointments_today(p_chat_id, p_date)`
 *      → Returns full appointment data (client name, phone, services, price, etc.)
 *      → Only available if the RPC function has been deployed to Supabase.
 *
 *   2. Fallback: `get_public_booked_slots(p_barber_id, p_appointment_date)`
 *      → Returns basic slot data (time, duration) per barber, iterated sequentially.
 *      → Enriched with barber name locally; client/service info is unavailable.
 *      → Used when the primary RPC hasn't been deployed yet or throws an error.
 *
 * === Timezone Handling ===
 *   All date calculations use America/Sao_Paulo (GMT-3) regardless of where
 *   the Vercel serverless function is physically executing. This ensures that
 *   "today" always matches the barbershop's local date in Votorantim, SP, Brazil.
 *
 * @see https://core.telegram.org/bots/api          — Telegram Bot API docs
 * @see https://supabase.com/docs                   — Supabase docs
 * @see ../supabase-schema.sql                      — Database schema reference
 * @see ../supabase-security-hardening.sql           — RLS + RPC definitions
 */

// =============================================================================
// Configuration Constants
// =============================================================================

/** @const {string} SUPABASE_URL - Base URL for the Supabase project (PostgREST API) */
const SUPABASE_URL = 'https://mblmmfvibowclskdzzsf.supabase.co';

/**
 * @const {string} SUPABASE_ANON_KEY - Supabase anonymous (public) API key.
 * This key is safe to expose client-side; access is controlled by RLS policies
 * and SECURITY DEFINER RPC functions in Supabase.
 */
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ibG1tZnZpYm93Y2xza2R6enNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MjYyMzIsImV4cCI6MjA5NDIwMjIzMn0.55bfbeJFoaxuqfEFuhZNMJHoVt-wGPpg2D3SVWUX9So';

/** @const {string} TELEGRAM_BOT_TOKEN - Bot token for @PereiraBarbershop_bot (used to call the Telegram Bot API) */
const TELEGRAM_BOT_TOKEN = '8932305524:AAE4CBvVQb-lMG4lnE57WVRKr7Pdwteewds';

// =============================================================================
// Main Webhook Handler
// =============================================================================

/**
 * Vercel Serverless Function entry point.
 * Handles incoming Telegram webhook POST requests and routes them to the
 * appropriate command handler.
 *
 * @async
 * @function handler
 * @param {import('http').IncomingMessage & { body: object }} req - The Vercel request object.
 *   - `req.body` contains the Telegram `Update` object sent by Telegram's webhook.
 *   - See: https://core.telegram.org/bots/api#update
 * @param {import('http').ServerResponse} res - The Vercel response object.
 * @returns {Promise<void>} Sends a JSON response back to Vercel (not to the user —
 *   the actual reply goes through the Telegram Bot API).
 *
 * @example
 *   // Telegram sends: POST /api/telegram
 *   // { "message": { "chat": { "id": 12345 }, "text": "/hoje", "from": { "first_name": "Gabriel" } } }
 *   // → Bot replies via Telegram API with today's appointments
 */
export default async function handler(req, res) {
  // -------------------------------------------------------------------------
  // Health check / non-POST requests
  // Telegram only sends POST, so anything else (GET, OPTIONS, etc.) is a
  // lightweight health-check that confirms the endpoint is alive.
  // -------------------------------------------------------------------------
  if (req.method !== 'POST') {
    return res.status(200).json({ ok: true, message: 'Telegram webhook endpoint' });
  }

  try {
    /** @type {object} update - The Telegram Update object from the webhook payload */
    const update = req.body;

    // -------------------------------------------------------------------------
    // Guard: ignore updates without a message (e.g., edited messages, callbacks)
    // -------------------------------------------------------------------------
    if (!update.message) {
      return res.status(200).json({ ok: true });
    }

    // -------------------------------------------------------------------------
    // Extract key fields from the Telegram message
    // -------------------------------------------------------------------------
    const message = update.message;
    const chat = message.chat;
    const from = message.from;
    const text = message.text;

    // If there's no chat or no text (e.g., sticker, photo), silently ignore
    if (!chat || !text) {
      return res.status(200).json({ ok: true });
    }

    /** @type {number} chatId - Telegram chat ID, used to identify the sender and reply */
    const chatId = chat.id;

    /** @type {string} firstName - Sender's first name for personalized responses */
    const firstName = from.first_name || 'Visitante';

    /** @type {string} command - Normalized (lowercase, trimmed) command text for matching */
    const command = text.toLowerCase().trim();

    // -------------------------------------------------------------------------
    // Command Routing
    // -------------------------------------------------------------------------
    let responseText = '';

    if (command === '/start' || command === 'oi' || command === 'ola') {
      // -----------------------------------------------------------------------
      // /start command — Welcome message with Chat ID
      // The Chat ID is needed by the barbershop admin (Gabriel) to link this
      // Telegram user to a barber record in the Supabase `barbers` table.
      // -----------------------------------------------------------------------
      responseText = `👋 Oi, ${firstName}!

📱 Seu <b>Chat ID</b> é: <code>${chatId}</code>

💡 Copie este número e envie para o Gabriel configurar!

📍 Link do site: https://www.pereira-barbershop.com.br/agendar.html`;
    } else if (command === '/hoje' || command === '/agenda' || command === '/agendamentos') {
      // -----------------------------------------------------------------------
      // /hoje (or aliases) — Fetch today's appointments
      // Delegates to getTodayAppointments() which handles the full RPC fallback
      // chain and formats the response based on whether the sender is a barber.
      // -----------------------------------------------------------------------
      responseText = await getTodayAppointments(String(chatId));
    } else {
      // -----------------------------------------------------------------------
      // Unrecognized command — Show help/usage message
      // -----------------------------------------------------------------------
      responseText = `👋 Oi, ${firstName}!

📝 Comandos disponíveis:
• <b>/start</b> - Ver seu Chat ID
• <b>/hoje</b> - Ver agendamentos de hoje

📍 Site: https://www.pereira-barbershop.com.br`;
    }

    // -------------------------------------------------------------------------
    // Send the response back to the user via Telegram Bot API
    // Uses HTML parse_mode for rich formatting (<b>, <code>, etc.)
    // See: https://core.telegram.org/bots/api#sendmessage
    // -------------------------------------------------------------------------
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

    /** @type {object} telegramData - Parsed response from Telegram API (contains result or error) */
    const telegramData = await telegramResponse.json();

    // Return 200 to Vercel so Telegram doesn't retry the webhook delivery.
    // Telegram considers any non-2xx as a failure and will retry up to ~3 times.
    return res.status(200).json({ ok: true, telegram: telegramData });

  } catch (error) {
    // -------------------------------------------------------------------------
    // Global error handler — catches any unhandled exception in the webhook.
    // We log it server-side (Vercel logs) and return 500.
    // Note: returning 500 may cause Telegram to retry the webhook, which is
    // acceptable for transient errors.
    // -------------------------------------------------------------------------
    console.error('Erro no webhook:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
}

// =============================================================================
// Appointment Retrieval
// =============================================================================

/**
 * Fetches and formats today's appointments for the given Telegram chat ID.
 *
 * This function performs the following steps:
 *   1. Calculates today's date in America/Sao_Paulo timezone (GMT-3).
 *   2. Fetches all barbers from the `barbers` table.
 *   3. Determines if the sender is a barber (by matching `telegram_chat_id`).
 *   4. Attempts to fetch appointments via the primary RPC function
 *      (`get_barber_appointments_today`), which returns full data including
 *      client name, phone, services, price, and observations.
 *   5. If the primary RPC fails (not deployed yet, or returns an error code),
 *      falls back to `getAppointmentsFallback()` which iterates over barbers
 *      and calls `get_public_booked_slots` per barber.
 *   6. Formats the response differently depending on whether the sender is a
 *      barber (personalized view) or an admin/owner (all appointments).
 *
 * @async
 * @function getTodayAppointments
 * @param {string} chatId - The Telegram chat ID of the message sender.
 *   Used to (a) identify if the sender is a barber, and (b) pass to the
 *   primary RPC function `get_barber_appointments_today` which filters by chat ID.
 * @returns {Promise<string>} A formatted string (with HTML tags) ready to be
 *   sent as a Telegram message. Contains the list of appointments or a
 *   "no appointments" message.
 *
 * @see getAppointmentsFallback — The secondary data retrieval strategy
 */
async function getTodayAppointments(chatId) {
  // =========================================================================
  // Date Calculation — America/Sao_Paulo (GMT-3)
  // Since Vercel serverless functions may execute in any AWS region, we
  // manually compute the Brazil-local date to ensure "today" is correct.
  // Formula: UTC time + Brazil offset (-3 hours) = local Sao Paulo time.
  // =========================================================================
  const now = new Date();
  const brazilOffset = -3 * 60; // GMT-3 in minutes
  const utcMs = now.getTime() + (now.getTimezoneOffset() * 60000); // Convert local time → UTC ms
  const brazilDate = new Date(utcMs + (brazilOffset * 60000));     // Apply GMT-3 offset
  /** @type {string} today - ISO date string "YYYY-MM-DD" in Brazil timezone */
  const today = brazilDate.toISOString().split('T')[0];

  try {
    // ========================================================================
    // Step 1: Fetch all barbers from Supabase
    // We need the full barber list to:
    //   (a) Check if the sender's chatId matches a barber (identity check).
    //   (b) Iterate over barbers in the fallback path.
    // ========================================================================
    const barbersResponse = await fetch(`${SUPABASE_URL}/rest/v1/barbers?select=*`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    /** @type {Array<object>} barbers - Array of barber records from the `barbers` table */
    const barbers = await barbersResponse.json();

    // ========================================================================
    // Step 2: Identify if the sender is a barber
    // Match the Telegram chat ID against each barber's `telegram_chat_id` field.
    // This determines the response format:
    //   - Barber → shows only THEIR appointments (personalized).
    //   - Non-barber → shows ALL appointments (admin/owner overview).
    // ========================================================================
    const barber = barbers.find(b => String(b.telegram_chat_id) === String(chatId));

    // ========================================================================
    // Step 3: Fetch appointments via RPC Fallback Chain
    //
    // PRIMARY RPC: get_barber_appointments_today(p_chat_id, p_date)
    //   - This is the preferred method. It runs as a SECURITY DEFINER function
    //     in Supabase, bypassing RLS to return full appointment details:
    //     client name, phone, service names, price, duration, observations.
    //   - It accepts a chat_id parameter so it automatically filters by barber
    //     (or returns all if the chat_id doesn't match a barber).
    //   - Returns an array of appointment objects, or an object with a `.code`
    //     property if the RPC doesn't exist or there's a server error.
    //
    // FALLBACK: getAppointmentsFallback(barber, barbers, today)
    //   - Used when the primary RPC is unavailable (not yet deployed, or threw
    //     an exception). Calls `get_public_booked_slots` per barber individually.
    //   - Returns limited data: time, duration, barber name only. Client info
    //     and service details are not available through this path.
    // ========================================================================
    let appointments = [];

    // --- Try PRIMARY RPC first ---
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

      // Check if the RPC returned a valid array (not an error object).
      // Supabase RPC errors come back as { code: "...", message: "..." }.
      // We also accept empty arrays (length === 0) as valid ("no appointments").
      if (Array.isArray(rpcData) && rpcData.length >= 0 && !rpcData.code) {
        // -------------------------------------------------------------------
        // Primary RPC succeeded — map to a normalized appointment structure.
        // Each field is extracted explicitly to ensure consistent shape
        // regardless of the RPC's internal column naming.
        // -------------------------------------------------------------------
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
        // -------------------------------------------------------------------
        // RPC returned an error code (e.g., function doesn't exist yet).
        // Fall through to the secondary retrieval strategy.
        // -------------------------------------------------------------------
        appointments = await getAppointmentsFallback(barber, barbers, today);
      }
    } catch (e) {
      // -----------------------------------------------------------------------
      // Exception during primary RPC call (network error, function not found, etc.)
      // Silently fall through to the fallback strategy.
      // -----------------------------------------------------------------------
      appointments = await getAppointmentsFallback(barber, barbers, today);
    }

    // ========================================================================
    // Step 4: Format the "no appointments" early return
    // If there are zero appointments for today, return a cheerful empty message.
    // ========================================================================
    if (!appointments || appointments.length === 0) {
      return `📅 Agendamentos de Hoje (${formatDate(today)})

🎉 Nenhum agendamento para hoje!

Aproveite o dia! 🌟`;
    }

    // ========================================================================
    // Step 5: Build the formatted response
    // ========================================================================
    /** @type {string} responseText - The accumulated message text with HTML formatting */
    let responseText = `📅 Agendamentos de Hoje (${formatDate(today)})\n\n`;

    if (barber) {
      // ======================================================================
      // BARBER VIEW — Show only this barber's appointments with full details.
      // Includes: time, client name, services, price, and optional notes (obs).
      // Status emoji: ✅ confirmed | ⏳ pending | ❌ cancelled/other
      // ======================================================================
      responseText += `👤 <b>SEUS AGENDAMENTOS:</b>\n\n`;

      appointments.forEach((apt, index) => {
        // Extract HH:MM from the time string (e.g., "14:30:00" → "14:30")
        const time = apt.appointment_time ? String(apt.appointment_time).substring(0, 5) : '--:--';
        const client = apt.client_name || 'Cliente';

        // service_names can be either an array or a string depending on the RPC
        const services = apt.service_names
          ? (Array.isArray(apt.service_names) ? apt.service_names.join(', ') : String(apt.service_names))
          : 'N/A';

        // Map appointment status to a visual emoji indicator
        const statusEmoji = apt.status === 'confirmed' ? '✅' : apt.status === 'pending' ? '⏳' : '❌';

        // Format price in Brazilian currency format (R$ XX,XX)
        const price = apt.total_price ? ` — R$ ${Number(apt.total_price).toFixed(2).replace('.', ',')}` : '';

        responseText += `${index + 1}. ${statusEmoji} <b>${time}</b> - ${client}\n`;
        responseText += `   💇 ${services}${price}\n`;

        // Only show the observation line if there is one
        if (apt.obs) {
          responseText += `   📝 ${apt.obs}\n`;
        }
        responseText += '\n';
      });

      responseText += `📊 Total: ${appointments.length} agendamento(s)`;
    } else {
      // ======================================================================
      // ADMIN/OWNER VIEW — Show ALL appointments across all barbers.
      // This view is shown to anyone whose chatId is NOT linked to a barber.
      // Includes: time, client name, services, and barber name.
      // (Does not include price or observations in the summary view.)
      // ======================================================================
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
    // ========================================================================
    // Error handler for the entire appointment retrieval process.
    // This catches errors from Supabase queries, RPC calls, etc.
    // Returns a user-friendly error message (no technical details exposed).
    // ========================================================================
    console.error('Erro ao buscar agendamentos:', error);
    return `❌ Erro ao buscar agendamentos.

Tente novamente mais tarde ou entre em contato com o Gabriel.`;
  }
}

// =============================================================================
// Fallback Appointment Retrieval Strategy
// =============================================================================

/**
 * Secondary (fallback) appointment retrieval strategy using the
 * `get_public_booked_slots` RPC function.
 *
 * This function is called when the primary RPC (`get_barber_appointments_today`)
 * is unavailable. It iterates over the target barbers one-by-one and calls
 * `get_public_booked_slots` for each, which returns basic slot information
 * (time and duration only). The results are enriched with the barber's name
 * locally, since the RPC doesn't return client or service details.
 *
 * === Limitations compared to the primary RPC ===
 *   - No client name (always shows "Cliente")
 *   - No client phone
 *   - No service names (always shows null → displayed as "N/A")
 *   - No price information
 *   - No observations/notes
 *   - Status is always assumed "confirmed"
 *
 * @async
 * @function getAppointmentsFallback
 * @param {object|undefined} barber - The barber object matching the sender's chat ID,
 *   or `undefined` if the sender is not a recognized barber.
 * @param {Array<object>} barbers - Array of all barber records from the `barbers` table.
 *   Each barber object must have at least `{ id, name, telegram_chat_id, active }`.
 * @param {string} today - Today's date in "YYYY-MM-DD" format (America/Sao_Paulo timezone).
 * @returns {Promise<Array<object>>} Array of appointment-like objects sorted by time,
 *   each containing: `{ appointment_time, total_duration, barber_name, client_name, service_names, status }`.
 *
 * @see getTodayAppointments — The primary caller that invokes this fallback
 */
async function getAppointmentsFallback(barber, barbers, today) {
  // ==========================================================================
  // Determine which barbers to query:
  //   - If the sender IS a barber → query only that barber's slots.
  //   - If the sender is NOT a barber → query all ACTIVE barbers' slots.
  // ==========================================================================
  const targetBarbers = barber ? [barber] : barbers.filter(b => b.active);
  /** @type {Array<object>} allSlots - Accumulator for all retrieved slots across barbers */
  let allSlots = [];

  // ==========================================================================
  // Sequential iteration over each target barber.
  // Note: These are sequential (not parallel) fetches. This is intentional to
  // avoid rate-limiting with Supabase's free tier and to keep the logic simple.
  // Each iteration calls the `get_public_booked_slots` RPC with the barber's ID.
  // ==========================================================================
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

      // -----------------------------------------------------------------------
      // Enrich each slot with the barber's name and default values for
      // fields not returned by this RPC (client_name, service_names, etc.)
      // -----------------------------------------------------------------------
      if (Array.isArray(slots)) {
        const enriched = slots.map(s => ({
          appointment_time: s.appointment_time,
          total_duration: s.total_duration,
          barber_name: b.name,
          client_name: 'Cliente',   // Not available via this RPC
          service_names: null,       // Not available via this RPC
          status: 'confirmed'        // Assumed confirmed (no status field from this RPC)
        }));
        allSlots = allSlots.concat(enriched);
      }
    } catch (e) {
      // -----------------------------------------------------------------------
      // Per-barber error handling — log and continue to the next barber.
      // A failure for one barber should not prevent fetching others.
      // -----------------------------------------------------------------------
      console.error(`Erro ao buscar slots do barbeiro ${b.name}:`, e);
    }
  }

  // ==========================================================================
  // Sort all slots chronologically by appointment_time (string comparison works
  // for "HH:MM" or "HH:MM:SS" format since they sort lexicographically).
  // ==========================================================================
  allSlots.sort((a, b) => String(a.appointment_time).localeCompare(String(b.appointment_time)));
  return allSlots;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Formats a date string into a human-readable Portuguese (pt-BR) format.
 * Used to display the date header in appointment list messages.
 *
 * The "T12:00:00" suffix ensures the date is parsed as noon local time,
 * avoiding timezone-related date shifts that can occur when parsing midnight.
 *
 * @function formatDate
 * @param {string} dateStr - Date in "YYYY-MM-DD" format.
 * @returns {string} Formatted date string, e.g., "segunda-feira, 12 de maio de 2026".
 *
 * @example
 *   formatDate('2026-05-12') // → "segunda-feira, 12 de maio de 2026"
 *   formatDate('2026-01-01') // → "quinta-feira, 1 de janeiro de 2026"
 */
function formatDate(dateStr) {
  // Parse at noon to prevent timezone offset from shifting the date
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}
