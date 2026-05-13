(function () {
    var currentStep = 1;
    var totalSteps = 4;

    var booking = {
        barber: null,
        barberName: null,
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

    var BARBERS = {
        rafael: { name: "Rafael", schedule: { start: "09:00", end: "19:00", days: [1, 2, 3, 4, 5, 6] } },
        gabriel: { name: "Gabriel", schedule: { start: "09:00", end: "19:00", days: [1, 2, 3, 4, 5, 6] } },
        marcus: { name: "Marcus Vinicius", schedule: { start: "09:00", end: "19:00", days: [1, 2, 3, 4, 5, 6] } },
    };

    var SLOT_INTERVAL = 30;

    function $(id) { return document.getElementById(id); }
    function $$(sel) { return document.querySelectorAll(sel); }

    function init() {
        setupBarbers();
        setupCalendar();
        setupServices();
        setupNav();
        updateNavButtons();
    }

    function setupBarbers() {
        var options = $$(".barber-option");
        options.forEach(function (opt) {
            opt.addEventListener("click", function () {
                options.forEach(function (o) { o.classList.remove("selected"); });
                opt.classList.add("selected");
                booking.barber = opt.dataset.barber;
                booking.barberName = BARBERS[booking.barber].name;
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

    function renderTimeSlots() {
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

            var selClass = booking.time === timeStr ? " selected" : "";
            html += '<button class="time-slot' + selClass + (disabled ? " disabled" : "") + '"' +
                (disabled ? " disabled" : "") +
                ' data-time="' + timeStr + '">' + timeStr + "</button>";
        }

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
        var barberSchedule = BARBERS[booking.barber] ? BARBERS[booking.barber].schedule : null;

        $("sum-barber").textContent = booking.barberName;
        $("sum-date").textContent = booking.dateFormatted;
        $("sum-time").textContent = booking.time;
        $("sum-services").textContent = booking.services.map(function (s) { return s.name; }).join(", ");
        $("sum-total").textContent = "R$ " + booking.totalPrice.toFixed(2).replace(".", ",");
    }

    function submitBooking() {
        if (!validateStep(4)) return;

        var confirmation = $("step-confirm");
        var details = $("confirm-details");

        details.innerHTML =
            '<div class="summary-item"><i class="fas fa-user"></i><span>' + booking.barberName + '</span></div>' +
            '<div class="summary-item"><i class="fas fa-calendar"></i><span>' + booking.dateFormatted + '</span></div>' +
            '<div class="summary-item"><i class="fas fa-clock"></i><span>' + booking.time + '</span></div>' +
            '<div class="summary-item"><i class="fas fa-cut"></i><span>' + booking.services.map(function (s) { return s.name; }).join(", ") + '</span></div>' +
            '<div class="summary-item total"><i class="fas fa-money-bill-wave"></i><span>R$ ' + booking.totalPrice.toFixed(2).replace(".", ",") + '</span></div>';

        var msg = "Olá! Acabei de agendar pelo site:%0A" +
            "%0A*" + booking.barberName + "*" +
            "%0A📅 " + booking.dateFormatted +
            "%0A🕐 " + booking.time +
            "%0A✂ " + booking.services.map(function (s) { return s.name; }).join(", ") +
            "%0A💰 R$ " + booking.totalPrice.toFixed(2).replace(".", ",") +
            "%0A%0ANome: " + booking.clientName +
            "%0ATel: " + booking.clientPhone;

        $("btn-whatsapp-confirm").href = "https://wa.me/5515981311623?text=" + msg;

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
