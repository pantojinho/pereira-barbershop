(function () {
    'use strict';

    var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    var currentStep = 1;
    var totalSteps = 4;

    var booking = {
        barber: null,
        barberName: null,
        barberId: null,
        date: null,
        dateFormatted: null,
        time: null,
        services: [],
        totalPrice: 0,
        totalDuration: 0,
        clientName: null,
        clientPhone: null,
    };

    var calendarDate = new Date();
    var selectedDate = null;
    var BARBERS = {};
    var SERVICES_DB = [];
    var SLOT_INTERVAL = 30;

    function $(id) { return document.getElementById(id); }
    function $$(sel) { return document.querySelectorAll(sel); }

    function escapeHTML(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
            return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
        });
    }

    async function init() {
        await loadBarbers();
        await loadServices();
        setupCalendar();
        setupNav();
        updateNavButtons();
    }

    async function loadBarbers() {
        try {
            var result = await sb.from('barbers').select('*').eq('active', true).order('sort_order');
            var barbers = result.data || [];
            BARBERS = {};
            var html = '';
            barbers.forEach(function (b) {
                var key = b.id;
                BARBERS[key] = {
                    id: b.id,
                    name: b.name,
                    schedule: {
                        start: b.schedule_start,
                        end: b.schedule_end,
                        days: b.work_days || []
                    }
                };
                html += '<div class="barber-option" data-barber="' + key + '">' +
                    '<div class="barber-icon"><i class="fas fa-cut"></i></div>' +
                    '<div class="barber-info">' +
                        '<div class="barber-name">' + escapeHTML(b.name) + '</div>' +
                        '<div class="barber-desc">Barbeiro</div>' +
                    '</div>' +
                    '<div class="barber-check"><i class="fas fa-check-circle"></i></div>' +
                '</div>';
            });
            if (!html) html = '<p class="step-subtitle">Nenhum barbeiro disponível no momento.</p>';
            $('barber-list').innerHTML = html;
            setupBarbers();
        } catch (err) {
            $('barber-list').innerHTML = '<p class="step-subtitle">Erro ao carregar barbeiros.</p>';
        }
    }

    async function loadServices() {
        try {
            var result = await sb.from('services').select('*').eq('active', true).order('sort_order');
            SERVICES_DB = result.data || [];
            var html = '';
            SERVICES_DB.forEach(function (s, idx) {
                var hours = Math.floor(s.duration_min / 60);
                var mins = s.duration_min % 60;
                var durationStr = '';
                if (hours > 0) durationStr += hours + 'h';
                if (mins > 0) durationStr += (hours > 0 ? '' : '') + mins + 'min';

                var featuredClass = (idx === 1) ? ' featured' : '';
                var tagHtml = (idx === 1) ? '<div class="service-tag">MAIS PEDIDO</div>' : '';

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
            setupServices();
        } catch (err) {
            $('services-list').innerHTML = '<p class="step-subtitle">Erro ao carregar serviços.</p>';
        }
    }

    function setupBarbers() {
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
    }

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

    function renderCalendar() {
        var year = calendarDate.getFullYear();
        var month = calendarDate.getMonth();
        var months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        $("current-month-year").textContent = months[month] + " " + year;

        var firstDay = new Date(year, month, 1).getDay();
        var daysInMonth = new Date(year, month + 1, 0).getDate();
        var today = new Date();
        today.setHours(0, 0, 0, 0);

        var barberSchedule = booking.barber ? BARBERS[booking.barber].schedule : null;

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
            var isSunday = dayOfWeek === 0;
            var barberWorks = barberSchedule ? barberSchedule.days.indexOf(dayOfWeek) !== -1 : true;
            var disabled = isPast || isSunday || !barberWorks;
            var selClass = selectedDate && selectedDate.getTime() === date.getTime() ? " selected" : "";
            var todayClass = isToday ? " today" : "";

            html += '<button class="day' + selClass + todayClass + (disabled ? " disabled" : "") + '"' +
                (disabled ? " disabled" : "") +
                ' data-date="' + year + "-" + String(month + 1).padStart(2, "0") + "-" + String(d).padStart(2, "0") + '">' +
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
                renderTimeSlots();
                updateNavButtons();
            });
        });
    }

    function formatDate(dateStr) {
        var parts = dateStr.split("-");
        var d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        var days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
        var months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
        return days[d.getDay()] + ", " + d.getDate() + " " + months[d.getMonth()] + " " + d.getFullYear();
    }

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

    async function renderTimeSlots() {
        if (!selectedDate || !booking.barber) {
            $("time-slots").innerHTML = "";
            $("time-hint").textContent = "Selecione uma data primeiro";
            return;
        }

        var schedule = BARBERS[booking.barber].schedule;
        var startParts = schedule.start.split(":");
        var endParts = schedule.end.split(":");
        var startMin = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
        var endMin = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);
        var duration = booking.totalDuration || 60;
        var lastSlotMin = endMin - duration;

        var now = new Date();
        var today = new Date();
        today.setHours(0, 0, 0, 0);
        var isToday = selectedDate.getTime() === today.getTime();

        $("time-hint").textContent = "Horários para " + booking.dateFormatted;

        var bookedSlots = await getBookedSlots(booking.barberId, booking.date);

        var bookedTimes = {};
        bookedSlots.forEach(function (appt) {
            var t = appt.appointment_time;
            if (typeof t === 'string') t = t.substring(0, 5);
            var durationMin = Number(appt.total_duration || SLOT_INTERVAL);
            var parts = t.split(':');
            var bookedStart = parseInt(parts[0]) * 60 + parseInt(parts[1]);
            var bookedEnd = bookedStart + durationMin;
            for (var busy = bookedStart; busy < bookedEnd; busy += SLOT_INTERVAL) {
                bookedTimes[String(Math.floor(busy / 60)).padStart(2, '0') + ':' + String(busy % 60).padStart(2, '0')] = true;
            }
        });

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
            for (var check = m; check < m + duration; check += SLOT_INTERVAL) {
                var checkTime = String(Math.floor(check / 60)).padStart(2, '0') + ':' + String(check % 60).padStart(2, '0');
                if (bookedTimes[checkTime]) disabled = true;
            }

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

    function setupServices() {
        var options = $$(".service-option");
        options.forEach(function (opt) {
            opt.addEventListener("click", function () {
                opt.classList.toggle("selected");
                updateServiceSummary();
                updateNavButtons();
                if (selectedDate) renderTimeSlots();
            });
        });
    }

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

        if (step === 2) {
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
            if (!booking.date || !booking.time) {
                if (!booking.date) shakeElement($("calendar-days"));
                else shakeElement($("time-slots"));
                return false;
            }
            return true;
        }
        if (step === 3) {
            if (booking.services.length === 0) {
                shakeElement($("services-list"));
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
            return true;
        }
        return true;
    }

    function shakeElement(el) {
        el.style.animation = "none";
        el.offsetHeight;
        el.style.animation = "shake 0.4s ease";
        setTimeout(function () { el.style.animation = ""; }, 500);
    }

    function updateNavButtons() {
        $("btn-back").style.visibility = currentStep === 1 ? "hidden" : "visible";

        if (currentStep === totalSteps) {
            $("btn-next").innerHTML = '<i class="fas fa-check"></i> Confirmar';
        } else {
            $("btn-next").innerHTML = 'Próximo <i class="fas fa-arrow-right"></i>';
        }

        var canNext = false;
        if (currentStep === 1) canNext = !!booking.barber;
        else if (currentStep === 2) canNext = !!(booking.date && booking.time);
        else if (currentStep === 3) canNext = booking.services.length > 0;
        else if (currentStep === 4) canNext = true;

        $("btn-next").disabled = !canNext;
    }

    function populateSummary() {
        $("sum-barber").textContent = booking.barberName;
        $("sum-date").textContent = booking.dateFormatted;
        $("sum-time").textContent = booking.time;
        $("sum-services").textContent = booking.services.map(function (s) { return s.name; }).join(", ");
        $("sum-total").textContent = "R$ " + booking.totalPrice.toFixed(2).replace(".", ",");
    }

    async function createBooking(serviceIds) {
        var rpcResult = await sb.rpc('create_public_appointment', {
            p_barber_id: booking.barberId,
            p_service_ids: serviceIds,
            p_appointment_date: booking.date,
            p_appointment_time: booking.time + ':00',
            p_client_name: booking.clientName,
            p_client_phone: booking.clientPhone
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
            status: 'confirmed',
            total_price: booking.totalPrice,
            total_duration: booking.totalDuration
        });
    }

    async function submitBooking() {
        if (!validateStep(4)) return;

        var serviceIds = booking.services.map(function (s) { return s.id; });
        try {
            var result = await createBooking(serviceIds);
            if (result.error) {
                alert('Erro ao salvar agendamento: ' + result.error.message);
                return;
            }
        } catch (err) {
            alert('Erro de conexão. Tente novamente.');
            return;
        }

        var confirmation = $("step-confirm");
        var details = $("confirm-details");

        details.innerHTML =
            '<div class="summary-item"><i class="fas fa-user"></i><span>' + escapeHTML(booking.barberName) + '</span></div>' +
            '<div class="summary-item"><i class="fas fa-calendar"></i><span>' + escapeHTML(booking.dateFormatted) + '</span></div>' +
            '<div class="summary-item"><i class="fas fa-clock"></i><span>' + escapeHTML(booking.time) + '</span></div>' +
            '<div class="summary-item"><i class="fas fa-cut"></i><span>' + escapeHTML(booking.services.map(function (s) { return s.name; }).join(", ")) + '</span></div>' +
            '<div class="summary-item total"><i class="fas fa-money-bill-wave"></i><span>R$ ' + booking.totalPrice.toFixed(2).replace(".", ",") + '</span></div>';

        var msg = "Olá! Acabei de agendar pelo site:\n" +
            "\n*" + booking.barberName + "*" +
            "\nData: " + booking.dateFormatted +
            "\nHorário: " + booking.time +
            "\nServiço: " + booking.services.map(function (s) { return s.name; }).join(", ") +
            "\nTotal: R$ " + booking.totalPrice.toFixed(2).replace(".", ",") +
            "\n\nNome: " + booking.clientName +
            "\nTel: " + booking.clientPhone;

        $("btn-whatsapp-confirm").href = "https://wa.me/5515981311623?text=" + encodeURIComponent(msg);

        $$(".step-content").forEach(function (s) { s.classList.remove("active"); });
        confirmation.classList.add("active");
        $("booking-nav").style.display = "none";

        $$(".stepper .step").forEach(function (s) { s.classList.add("completed"); });
        $$(".step-line").forEach(function (l) { l.classList.add("active"); });
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
