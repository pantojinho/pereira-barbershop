/**
 * agendar.js — Página de Agendamento Online
 * Pereira's Barber Shop
 *
 * Fluxo de 4 etapas: Barbeiro → Serviços → Data/Horário → Dados do Cliente
 *
 * Supabase RPCs utilizadas:
 *   - get_public_barbers        → lista barbeiros ativos
 *   - get_public_services       → lista serviços disponíveis
 *   - get_public_booked_slots   → verifica horários já ocupados
 *   - create_public_appointment → cria o agendamento
 *
 * Após confirmação, notifica o barbeiro via Telegram (POST /api/telegram).
 * Timezone: America/Sao_Paulo (GMT-3).
 */
(function () {
    'use strict';

    // ── Cliente Supabase (anon key, seguro client-side) ──
    var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // ── Estado do wizard ──
    var currentStep = 1;
    var totalSteps = 4;

    /** Dados do agendamento sendo construído pelo wizard */
    var booking = {
        barber: null,        // nome do barbeiro
        barberName: null,    // nome de exibição
        barberId: null,      // UUID no Supabase
        date: null,          // YYYY-MM-DD
        dateFormatted: null, // exibição
        time: null,          // HH:MM
        services: [],        // serviços selecionados
        totalPrice: 0,       // R$ total
        totalDuration: 0,    // minutos
        clientName: null,
        clientPhone: null,
        obs: null
    };

    // ── Calendário ──
    var calendarDate = new Date();
    var selectedDate = null;

    // ── Cache ──
    var BARBERS = {};         // nome → dados do barbeiro
    var SERVICES_DB = [];     // todos os serviços
    var SLOT_INTERVAL = 30;  // minutos entre slots

    // ── Helpers DOM ──
    function $(id) { return document.getElementById(id); }
    function $$(sel) { return document.querySelectorAll(sel); }

    /** Escapa HTML para prevenir XSS */
    function escapeHTML(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
            return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
        });
    }

    /**
     * Inicializa a página. Suporta pré-seleção via URL:
     *   ?barber=Nome&service=Serviço
     */
    async function init() {
        var urlParams = new URLSearchParams(window.location.search);
        var preselectedBarber = urlParams.get('barber');
        var preselectedService = urlParams.get('service');

        await loadBarbers(preselectedBarber);
        await loadServices(preselectedService);
        setupCalendar();
        setupNav();
        updateNavButtons();
    }

    /**
     * Carrega barbeiros ativos e seus horários de trabalho.
     * Popula o cache BARBERS e renderiza a lista de seleção.
     * @param {string|null} preselectedBarber - Nome pré-selecionado via URL param
     */
    async function loadBarbers(preselectedBarber) {
        try {
            var result = await sb.from('barbers').select('*').eq('active', true).order('sort_order');
            var barbers = result.data || [];

            var schedResult = await sb.from('barber_schedules').select('*');
            var allSchedules = schedResult.data || [];

            console.log('[DEBUG] All schedules from DB:', allSchedules);

            BARBERS = {};
            var html = '';
            barbers.forEach(function (b) {
                var schedules = allSchedules.filter(function (s) { return s.barber_id === b.id; });
                console.log('[DEBUG] Barber ' + b.name + ' schedules:', schedules);
                var daySchedule = {};
                schedules.forEach(function (s) {
                    daySchedule[s.day_of_week] = {
                        start: String(s.start_time).substring(0, 5),
                        end: String(s.end_time).substring(0, 5)
                    };
                });

                console.log('[DEBUG] Barber ' + b.name + ' daySchedule:', daySchedule);

                BARBERS[b.id] = {
                    id: b.id,
                    name: b.name,
                    photo_url: b.photo_url,
                    schedule: daySchedule,
                    telegram_chat_id: b.telegram_chat_id
                };

                var barberIconHtml = b.photo_url
                    ? '<img src="' + escapeHTML(b.photo_url) + '" alt="' + escapeHTML(b.name) + '" class="barber-photo">'
                    : '<i class="fas fa-cut"></i>';

                html += '<div class="barber-option" data-barber="' + b.id + '">' +
                    '<div class="barber-icon">' + barberIconHtml + '</div>' +
                    '<div class="barber-info">' +
                        '<div class="barber-name">' + escapeHTML(b.name) + '</div>' +
                        '<div class="barber-desc">Barbeiro</div>' +
                    '</div>' +
                    '<div class="barber-check"><i class="fas fa-check-circle"></i></div>' +
                '</div>';
            });
            if (!html) html = '<p class="step-subtitle">Nenhum barbeiro disponível no momento.</p>';
            $('barber-list').innerHTML = html;
            setupBarbers(preselectedBarber);
        } catch (err) {
            $('barber-list').innerHTML = '<p class="step-subtitle">Erro ao carregar barbeiros.</p>';
        }
    }

    /**
     * Carrega serviços ativos do catálogo.
     * Popula SERVICES_DB e renderiza a lista de seleção.
     * @param {string|null} preselectedService - Nome pré-selecionado via URL param
     */
    async function loadServices(preselectedService) {
        try {
            var result = await sb.from('services').select('*').eq('active', true).order('sort_order');
            SERVICES_DB = result.data || [];
            var html = '';
            SERVICES_DB.forEach(function (s) {
                var hours = Math.floor(s.duration_min / 60);
                var mins = s.duration_min % 60;
                var durationStr = '';
                if (hours > 0) durationStr += hours + 'h';
                if (mins > 0) durationStr += (hours > 0 ? '' : '') + mins + 'min';

                var isFeatured = s.featured === true;
                var featuredClass = isFeatured ? ' featured' : '';
                var tagHtml = isFeatured ? '<div class="service-tag">MAIS PEDIDO</div>' : '';

                html += '<div class="service-option' + featuredClass + '" data-service="' + s.id + '" data-price="' + s.price + '" data-duration="' + s.duration_min + '">' +
                    tagHtml +
                    '<div class="service-radio"><i class="far fa-circle"></i></div>' +
                    '<div class="service-info">' +
                        '<div class="service-name">' + escapeHTML(s.name) + '</div>' +
                    '</div>' +
                    '<div class="service-meta">' +
                        '<div class="service-price">R$ ' + Number(s.price).toFixed(2).replace('.', ',') + '</div>' +
                        '<div class="service-duration"><i class="far fa-clock"></i> ' + durationStr + '</div>' +
                    '</div>' +
                '</div>';
            });
            if (!html) html = '<p class="step-subtitle">Nenhum serviço disponível no momento.</p>';
            $('services-list').innerHTML = html;
            setupServices(preselectedService);
        } catch (err) {
            $('services-list').innerHTML = '<p class="step-subtitle">Erro ao carregar serviços.</p>';
        }
    }

    /** Configura listeners de seleção de barbeiro */
    function setupBarbers(preselectedBarber) {
        var options = $$(".barber-option");
        options.forEach(function (opt) {
            opt.addEventListener("click", function () {
                options.forEach(function (o) { o.classList.remove("selected"); });
                opt.classList.add("selected");
                var key = opt.dataset.barber;
                booking.barber = key;
                booking.barberId = key;
                booking.barberName = BARBERS[key] ? BARBERS[key].name : key;
                booking.date = null;
                booking.dateFormatted = null;
                booking.time = null;
                selectedDate = null;
                updateNavButtons();
            });
        });

        if (preselectedBarber) {
            var targetBarber = $$('.barber-option[data-barber="' + preselectedBarber + '"]');
            if (targetBarber.length > 0) {
                targetBarber[0].click();
            }
        }
    }

    /** Inicializa o calendário com navegação de meses */
    function setupCalendar() {
        renderCalendar();

        $("prev-month").addEventListener("click", function () {
            calendarDate.setMonth(calendarDate.getMonth() - 1);
            renderCalendar();
        });

        $("next-month").addEventListener("click", function () {
            calendarDate.setMonth(calendarDate.getMonth() + 1);
            renderCalendar();
        });
    }

    /** Renderiza o grid de dias do calendário para o mês atual */
    function renderCalendar() {
        var year = calendarDate.getFullYear();
        var month = calendarDate.getMonth();
        var months = ["Janeiro", "Fevereiro", "Março", "Abril", "Mai", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        $("current-month-year").textContent = months[month] + " " + year;

        var firstDay = new Date(year, month, 1).getDay();
        var daysInMonth = new Date(year, month + 1, 0).getDate();
        var today = new Date();
        today.setHours(0, 0, 0, 0);

        var barber = booking.barber ? BARBERS[booking.barber] : null;
        var barberSchedule = barber ? barber.schedule : null;

        var html = "";
        for (var i = 0; i < firstDay; i++) {
            html += '<button class="day empty" disabled></button>';
        }

        for (var d = 1; d <= daysInMonth; d++) {
            var date = new Date(year, month, d);
            date.setHours(0, 0, 0, 0);
            var dayOfWeek = date.getDay();
            var isPast = date < today;
            var isToday = date.getTime() === today.getTime();
            var dateStr = year + "-" + String(month + 1).padStart(2, "0") + "-" + String(d).padStart(2, "0");
            var barberWorksDay = barberSchedule ? !!barberSchedule[dayOfWeek] : true;
            var disabled = isPast || !barberWorksDay;
            var selClass = selectedDate && selectedDate.getTime() === date.getTime() ? " selected" : "";
            var todayClass = isToday ? " today" : "";

            html += '<button class="day' + selClass + todayClass + (disabled ? " disabled" : "") + '"' +
                (disabled ? " disabled" : "") +
                ' data-date="' + dateStr + '">' +
                d + "</button>";
        }

        $("calendar-days").innerHTML = html;

        $$("button.day:not(.disabled):not(.empty)").forEach(function (btn) {
            btn.addEventListener("click", function () {
                $$("button.day").forEach(function (b) { b.classList.remove("selected"); });
                btn.classList.add("selected");
                var parts = btn.dataset.date.split("-");
                selectedDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                booking.date = btn.dataset.date;
                booking.dateFormatted = formatDate(btn.dataset.date);
                booking.time = null;
                renderTimeSlots();
                updateNavButtons();
            });
        });
    }

    /** Formata data YYYY-MM-DD para exibição legível (dd/mm/aaaa) */
    function formatDate(dateStr) {
        var parts = dateStr.split("-");
        var d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        var days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
        var months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
        return days[d.getDay()] + ", " + d.getDate() + " " + months[d.getMonth()] + " " + d.getFullYear();
    }

    /**
     * Busca horários já agendados para um barbeiro numa data específica.
     * Usa RPC get_public_booked_slots (SECURITY DEFINER bypassa RLS).
     * @param {string} barberId - UUID do barbeiro
     * @param {string} date - Data YYYY-MM-DD
     * @returns {Array} Lista de slots ocupados com appointment_time e total_duration
     */
    async function getBookedSlots(barberId, date) {
        try {
            var rpcResult = await sb.rpc('get_public_booked_slots', {
                p_barber_id: barberId,
                p_appointment_date: date
            });
            if (!rpcResult.error) return rpcResult.data || [];

            if (!(rpcResult.error.message && rpcResult.error.message.indexOf('Could not find the function') >= 0)) {
                return [];
            }
            console.warn('Supabase booking hardening RPC is missing. Apply supabase-security-hardening.sql.');
        } catch (e) {}

        try {
            var result = await sb.from('appointments')
                .select('appointment_time, total_duration')
                .eq('barber_id', barberId)
                .eq('appointment_date', date)
                .neq('status', 'cancelled');
            return result.data || [];
        } catch (e) {
            return [];
        }
    }

    /**
     * Renderiza os horários disponíveis para a data selecionada.
     * Considera horário de funcionamento do barbeiro, slots já ocupados e duração dos serviços.
     * Desabilita slots com conflito de horário.
     */
    async function renderTimeSlots() {
        if (!selectedDate || !booking.barber) {
            $("time-slots").innerHTML = "";
            $("time-hint").textContent = "Selecione uma data primeiro";
            return;
        }

        var barber = BARBERS[booking.barber];
        var dayOfWeek = selectedDate.getDay();
        var daySchedule = barber.schedule[dayOfWeek];

        console.log('[DEBUG] Selected date:', selectedDate.toDateString(), 'Day of week:', dayOfWeek);
        console.log('[DEBUG] DaySchedule for barber ' + barber.name + ':', daySchedule);

        if (!daySchedule) {
            $("time-slots").innerHTML = '<p class="step-subtitle" style="padding:20px 0;">Este barbeiro não trabalha neste dia.</p>';
            $("time-hint").textContent = "Dia indisponível";
            return;
        }

        var startParts = daySchedule.start.split(":");
        var endParts = daySchedule.end.split(":");
        var startMin = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
        var endMin = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);
        var serviceDuration = booking.totalDuration || 60;
        var lastSlotMin = endMin - serviceDuration;

        console.log('[DEBUG] Schedule:', daySchedule.start, '-', daySchedule.end);
        console.log('[DEBUG] startMin:', startMin, 'endMin:', endMin, 'serviceDuration:', serviceDuration, 'lastSlotMin:', lastSlotMin);

        var now = new Date();
        var today = new Date();
        today.setHours(0, 0, 0, 0);
        var isToday = selectedDate.getTime() === today.getTime();

        $("time-hint").textContent = "Horários para " + booking.dateFormatted;

        var bookedSlots = await getBookedSlots(booking.barberId, booking.date);

        var bookedRanges = [];
        bookedSlots.forEach(function (appt) {
            var t = appt.appointment_time;
            if (typeof t === 'string') t = t.substring(0, 5);
            var durationMin = Number(appt.total_duration || SLOT_INTERVAL);
            var parts = t.split(':');
            var bookedStart = parseInt(parts[0]) * 60 + parseInt(parts[1]);
            bookedRanges.push({ start: bookedStart, end: bookedStart + durationMin });
        });

        function isOverlap(slotStart, slotDuration) {
            var slotEnd = slotStart + slotDuration;
            for (var i = 0; i < bookedRanges.length; i++) {
                if (slotStart < bookedRanges[i].end && slotEnd > bookedRanges[i].start) {
                    return true;
                }
            }
            return false;
        }

        var html = "";
        for (var m = startMin; m <= lastSlotMin; m += SLOT_INTERVAL) {
            var h = Math.floor(m / 60);
            var min = m % 60;
            var timeStr = String(h).padStart(2, "0") + ":" + String(min).padStart(2, "0");

            var disabled = false;
            if (isToday) {
                var currentMin = now.getHours() * 60 + now.getMinutes();
                if (m <= currentMin + 30) disabled = true;
            }

            if (isOverlap(m, serviceDuration)) disabled = true;

            var selClass = booking.time === timeStr ? " selected" : "";
            html += '<button class="time-slot' + selClass + (disabled ? " disabled" : "") + '"' +
                (disabled ? " disabled" : "") +
                ' data-time="' + timeStr + '">' + timeStr + "</button>";
        }

        if (!html) html = '<p class="step-subtitle" style="padding:20px 0;">Nenhum horário disponível nesta data.</p>';

        $("time-slots").innerHTML = html;

        $$(".time-slot:not(.disabled)").forEach(function (slot) {
            slot.addEventListener("click", function () {
                $$(".time-slot").forEach(function (s) { s.classList.remove("selected"); });
                slot.classList.add("selected");
                booking.time = slot.dataset.time;
                updateNavButtons();
            });
        });
    }

    /** Configura listeners de seleção de serviços (múltipla escolha) */
    function setupServices(preselectedService) {
        var options = $$(".service-option");
        options.forEach(function (opt) {
            opt.addEventListener("click", function () {
                options.forEach(function (o) { o.classList.remove("selected"); });
                opt.classList.add("selected");
                updateServiceSummary();
                updateNavButtons();
                booking.date = null;
                booking.dateFormatted = null;
                booking.time = null;
                selectedDate = null;
            });
        });

        if (preselectedService) {
            var targetService = $$('.service-option[data-service="' + preselectedService + '"]');
            if (targetService.length > 0) {
                targetService[0].click();
            }
        }
    }

    /** Atualiza o resumo de serviços selecionados (preço e duração total) */
    function updateServiceSummary() {
        var selected = $$(".service-option.selected");
        booking.services = [];
        booking.totalPrice = 0;
        booking.totalDuration = 0;

        selected.forEach(function (opt) {
            booking.services.push({
                id: opt.dataset.service,
                name: opt.querySelector(".service-name").textContent,
                price: parseFloat(opt.dataset.price),
                duration: parseInt(opt.dataset.duration),
            });
            booking.totalPrice += parseFloat(opt.dataset.price);
            booking.totalDuration += parseInt(opt.dataset.duration);
        });

        $("total-price").textContent = "R$ " + booking.totalPrice.toFixed(2).replace(".", ",");
        var hours = Math.floor(booking.totalDuration / 60);
        var mins = booking.totalDuration % 60;
        $("total-duration").textContent = hours > 0 ? hours + "h" + (mins > 0 ? mins + "min" : "") : mins + " min";
    }

    /** Configura botões de navegação do wizard (voltar/avançar) */
    function setupNav() {
        $("btn-back").addEventListener("click", function () {
            if (currentStep > 1) {
                currentStep--;
                showStep(currentStep);
            }
        });

        $("btn-next").addEventListener("click", function () {
            if (!validateStep(currentStep)) return;
            if (currentStep < totalSteps) {
                currentStep++;
                showStep(currentStep);
            } else {
                submitBooking();
            }
        });
    }

    function showStep(step) {
        $$(".step-content").forEach(function (s) { s.classList.remove("active"); });
        $("step-" + step).classList.add("active");

        $$(".stepper .step").forEach(function (s, i) {
            s.classList.remove("active", "completed");
            if (i + 1 === step) s.classList.add("active");
            if (i + 1 < step) s.classList.add("completed");
        });

        $$(".step-line").forEach(function (line, i) {
            line.classList.toggle("active", i < step - 1);
        });

        if (step === 3) {
            renderCalendar();
            if (selectedDate) renderTimeSlots();
        }

        if (step === 4) {
            populateSummary();
        }

        $("booking-nav").style.display = step === totalSteps + 1 ? "none" : "flex";
        updateNavButtons();
    }

    function validateStep(step) {
        if (step === 1) {
            if (!booking.barber) {
                shakeElement($("barber-list"));
                return false;
            }
            return true;
        }
        if (step === 2) {
            if (booking.services.length === 0) {
                shakeElement($("services-list"));
                return false;
            }
            return true;
        }
        if (step === 3) {
            if (!booking.date || !booking.time) {
                if (!booking.date) shakeElement($("calendar-days"));
                else shakeElement($("time-slots"));
                return false;
            }
            return true;
        }
        if (step === 4) {
            var name = $("client-name").value.trim();
            var phone = $("client-phone").value.trim();
            if (!name) {
                shakeElement($("client-name"));
                return false;
            }
            if (!phone || phone.replace(/\D/g, "").length < 10) {
                shakeElement($("client-phone"));
                return false;
            }
            booking.clientName = name;
            booking.clientPhone = phone;
            booking.obs = $("client-obs").value.trim();
            return true;
        }
        return true;
    }

    /** Animação de "shake" em elementos com erro de validação */
    function shakeElement(el) {
        el.style.animation = "none";
        el.offsetHeight;
        el.style.animation = "shake 0.4s ease";
        setTimeout(function () { el.style.animation = ""; }, 500);
    }

    /** Atualiza estado dos botões voltar/avançar baseado no step atual */
    function updateNavButtons() {
        $("btn-back").style.visibility = currentStep === 1 ? "hidden" : "visible";

        if (currentStep === totalSteps) {
            $("btn-next").innerHTML = '<i class="fas fa-check"></i> Confirmar';
        } else {
            $("btn-next").innerHTML = 'Próximo <i class="fas fa-arrow-right"></i>';
        }

        var canNext = false;
        if (currentStep === 1) canNext = !!booking.barber;
        else if (currentStep === 2) canNext = booking.services.length > 0;
        else if (currentStep === 3) canNext = !!(booking.date && booking.time);
        else if (currentStep === 4) canNext = true;

        $("btn-next").disabled = !canNext;
    }

    /** Preenche o painel de resumo final com todos os dados do agendamento */
    function populateSummary() {
        $("sum-barber").textContent = booking.barberName;
        $("sum-date").textContent = booking.dateFormatted;
        $("sum-time").textContent = booking.time;
        $("sum-services").textContent = booking.services.map(function (s) { return s.name; }).join(", ");
        $("sum-total").textContent = "R$ " + booking.totalPrice.toFixed(2).replace(".", ",");

        var obsContainer = $("sum-obs-container");
        if (booking.obs) {
            $("sum-obs").textContent = booking.obs;
            obsContainer.style.display = "flex";
        } else {
            obsContainer.style.display = "none";
        }
    }

    /**
     * Cria o agendamento no Supabase via RPC create_public_appointment.
     * Valida horário disponível no servidor (evita conflitos de corrida).
     * @param {Array} serviceIds - IDs dos serviços selecionados
     */
    async function createBooking(serviceIds) {
        var rpcResult = await sb.rpc('create_public_appointment', {
            p_barber_id: booking.barberId,
            p_service_ids: serviceIds,
            p_appointment_date: booking.date,
            p_appointment_time: booking.time + ':00',
            p_client_name: booking.clientName,
            p_client_phone: booking.clientPhone,
            p_obs: booking.obs || null
        });

        if (!rpcResult.error) return rpcResult;

        if (!(rpcResult.error.message && rpcResult.error.message.indexOf('Could not find the function') >= 0)) {
            return rpcResult;
        }

        console.warn('Supabase booking hardening RPC is missing. Apply supabase-security-hardening.sql.');
        return sb.from('appointments').insert({
            barber_id: booking.barberId,
            service_ids: serviceIds,
            service_names: booking.services.map(function (s) { return s.name; }),
            appointment_date: booking.date,
            appointment_time: booking.time + ':00',
            client_name: booking.clientName,
            client_phone: booking.clientPhone,
            obs: booking.obs || null,
            status: 'confirmed',
            total_price: booking.totalPrice,
            total_duration: booking.totalDuration
        });
    }

    /**
     * Submete o agendamento completo: valida → cria no Supabase → mostra confirmação → notifica Telegram
     */
    async function submitBooking() {
        if (!validateStep(4)) return;

        var nextBtn = $("btn-next");
        var originalHTML = nextBtn.innerHTML;
        nextBtn.disabled = true;
        nextBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

        var serviceIds = booking.services.map(function (s) { return s.id; });
        try {
            var result = await createBooking(serviceIds);
            if (result.error) {
                alert('Erro ao salvar agendamento: ' + result.error.message);
                nextBtn.disabled = false;
                nextBtn.innerHTML = originalHTML;
                return;
            }
        } catch (err) {
            alert('Erro de conexão. Tente novamente.');
            nextBtn.disabled = false;
            nextBtn.innerHTML = originalHTML;
            return;
        }

        var confirmation = $("step-confirm");
        var details = $("confirm-details");

        details.innerHTML =
            '<div class="summary-item"><i class="fas fa-user"></i><span>' + escapeHTML(booking.barberName) + '</span></div>' +
            '<div class="summary-item"><i class="fas fa-calendar"></i><span>' + escapeHTML(booking.dateFormatted) + '</span></div>' +
            '<div class="summary-item"><i class="fas fa-clock"></i><span>' + escapeHTML(booking.time) + '</span></div>' +
            '<div class="summary-item"><i class="fas fa-cut"></i><span>' + escapeHTML(booking.services.map(function (s) { return s.name; }).join(", ")) + '</span></div>' +
            (booking.obs ? '<div class="summary-item"><i class="fas fa-comment"></i><span>' + escapeHTML(booking.obs) + '</span></div>' : '') +
            '<div class="summary-item total"><i class="fas fa-money-bill-wave"></i><span>R$ ' + booking.totalPrice.toFixed(2).replace(".", ",") + '</span></div>';

        var msg = "Olá! Acabei de agendar pelo site:\n" +
            "\n*" + booking.barberName + "*" +
            "\nData: " + booking.dateFormatted +
            "\nHorário: " + booking.time +
            "\nServiço: " + booking.services.map(function (s) { return s.name; }).join(", ") +
            "\nTotal: R$ " + booking.totalPrice.toFixed(2).replace(".", ",") +
            (booking.obs ? "\nObs: " + booking.obs : "") +
            "\n\nNome: " + booking.clientName +
            "\nTel: " + booking.clientPhone;

        $("btn-whatsapp-confirm").href = "https://wa.me/5515981311623?text=" + encodeURIComponent(msg);

        // Enviar notificação via Telegram para o barbeiro
        sendTelegramNotificationToBarber();

        $$(".step-content").forEach(function (s) { s.classList.remove("active"); });
        confirmation.classList.add("active");
        $("booking-nav").style.display = "none";

        $$(".stepper .step").forEach(function (s) { s.classList.add("completed"); });
        $$(".step-line").forEach(function (l) { l.classList.add("active"); });
    }

    // Função para enviar notificação via Telegram para o barbeiro
    /**
     * Envia notificação de novo agendamento para o barbeiro via Telegram Bot.
     * Faz POST para /api/telegram que processa a mensagem.
     */
    function sendTelegramNotificationToBarber() {
        if (!TELEGRAM_BOT_TOKEN) {
            console.warn('TELEGRAM_BOT_TOKEN não configurado');
            return;
        }

        var barber = BARBERS[booking.barberId];
        if (!barber || !barber.telegram_chat_id) {
            console.log('Barbeiro não tem telegram_chat_id configurado');
            return;
        }

        var tgMsg = '\u2702 <b>Novo Agendamento pelo Site!</b>\n\n' +
            '\uD83D\uDC64 <b>Cliente:</b> ' + escapeHTML(booking.clientName) + '\n' +
            '\uD83D\uDD52 <b>Horário:</b> ' + escapeHTML(booking.time) + '\n' +
            '\uD83D\uDC87 <b>Serviço:</b> ' + escapeHTML(booking.services.map(function (s) { return s.name; }).join(', ')) + '\n' +
            '\uD83D\uDCC5 <b>Data:</b> ' + escapeHTML(booking.dateFormatted) + '\n' +
            '\uD83D\uDCDE <b>Telefone:</b> ' + escapeHTML(booking.clientPhone) + '\n' +
            (booking.obs ? '\uD83D\uDCAC <b>Obs:</b> ' + escapeHTML(booking.obs) + '\n' : '') +
            '\n\nPereira\'s Barber Shop';

        fetch('https://api.telegram.org/bot' + TELEGRAM_BOT_TOKEN + '/sendMessage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: barber.telegram_chat_id,
                text: tgMsg,
                parse_mode: 'HTML'
            })
        }).then(function (response) {
            return response.json();
        }).then(function (data) {
            if (!data.ok) {
                console.error('Erro ao enviar notificação Telegram:', data);
            } else {
                console.log('Notificação Telegram enviada com sucesso');
            }
        }).catch(function (e) {
            console.warn('Telegram send failed:', e);
        });
    }

    $("client-phone").addEventListener("input", function (e) {
        var v = e.target.value.replace(/\D/g, "");
        if (v.length > 11) v = v.slice(0, 11);
        if (v.length > 6) {
            e.target.value = "(" + v.slice(0, 2) + ") " + v.slice(2, 7) + "-" + v.slice(7);
        } else if (v.length > 2) {
            e.target.value = "(" + v.slice(0, 2) + ") " + v.slice(2);
        } else if (v.length > 0) {
            e.target.value = "(" + v;
        }
    });

    var style = document.createElement("style");
    style.textContent = "@keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-8px)} 75%{transform:translateX(8px)} }";
    document.head.appendChild(style);

    init();
})();
