(function () {
    'use strict';

    var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    var ITEMS_PER_PAGE = 15;
    var currentPage = 1;

    function $(id) { return document.getElementById(id); }
    function qs(sel) { return document.querySelector(sel); }
    function qsa(sel) { return document.querySelectorAll(sel); }

    function escapeHTML(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
            return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
        });
    }

    function jsString(value) {
        return String(value == null ? '' : value)
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "\\'")
            .replace(/\r?\n/g, ' ');
    }

    function formatDate(dateStr) {
        var d = new Date(dateStr + 'T00:00:00');
        var days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
        return days[d.getDay()] + ', ' + d.toLocaleDateString('pt-BR');
    }

    function formatPhone(phone) {
        return phone.replace(/\D/g, '').replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
    }

    function formatCurrency(value) {
        return 'R$ ' + Number(value).toFixed(2).replace('.', ',');
    }

    function formatTime(timeStr) {
        return timeStr.substring(0, 5);
    }

    var DAY_NAMES = {
        0: 'Dom', 1: 'Seg', 2: 'Ter', 3: 'Qua', 4: 'Qui', 5: 'Sex', 6: 'Sáb'
    };

    function toast(msg, type) {
        var el = document.createElement('div');
        el.className = 'toast ' + (type || '');
        el.textContent = msg;
        $('toast-container').appendChild(el);
        setTimeout(function () { el.remove(); }, 3000);
    }

    function showModal(title, bodyHTML, onSave, onOpen) {
        $('modal-title').textContent = title;
        $('modal-body').innerHTML = bodyHTML;
        $('modal-overlay').style.display = 'flex';
        $('modal-save').onclick = function () {
            if (onSave) onSave();
        };
        if (onOpen) onOpen();
    }

    function hideModal() {
        $('modal-overlay').style.display = 'none';
    }

    function showConfirm(title, msg, onConfirm) {
        $('confirm-title').textContent = title;
        $('confirm-body').textContent = msg;
        $('confirm-overlay').style.display = 'flex';
        $('confirm-ok').onclick = function () {
            $('confirm-overlay').style.display = 'none';
            if (onConfirm) onConfirm();
        };
    }

    function hideConfirm() {
        $('confirm-overlay').style.display = 'none';
    }

    function todayStr() {
        var d = new Date();
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    function getWeekRange() {
        var now = new Date();
        var day = now.getDay();
        var monday = new Date(now);
        monday.setDate(now.getDate() - ((day + 6) % 7));
        var sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        return {
            start: monday.getFullYear() + '-' + String(monday.getMonth() + 1).padStart(2, '0') + '-' + String(monday.getDate()).padStart(2, '0'),
            end: sunday.getFullYear() + '-' + String(sunday.getMonth() + 1).padStart(2, '0') + '-' + String(sunday.getDate()).padStart(2, '0')
        };
    }

    // ========== AUTH ==========

    async function handleLogin(e) {
        e.preventDefault();
        var email = $('login-email').value.trim();
        var password = $('login-password').value;
        var errEl = $('login-error');
        var btnLogin = $('btn-login');
        errEl.style.display = 'none';

        if (!email || !password) {
            errEl.textContent = 'Preencha email e senha.';
            errEl.style.display = 'block';
            return;
        }

        btnLogin.disabled = true;
        btnLogin.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Entrando...';

        try {
            var result = await sb.auth.signInWithPassword({ email: email, password: password });
            if (result.error) throw result.error;
            var allowed = await verifyAdminAccess();
            if (!allowed) {
                await sb.auth.signOut();
                errEl.textContent = 'Seu usuário não tem permissão de administrador.';
                errEl.style.display = 'block';
                btnLogin.disabled = false;
                btnLogin.innerHTML = '<i class="fas fa-sign-in-alt"></i> Entrar';
                return;
            }
            showAdminPanel(result.data.user);
        } catch (err) {
            errEl.textContent = err.message || 'Email ou senha incorretos.';
            errEl.style.display = 'block';
            btnLogin.disabled = false;
            btnLogin.innerHTML = '<i class="fas fa-sign-in-alt"></i> Entrar';
        }
    }

    async function handleLogout() {
        await sb.auth.signOut();
        $('admin-panel').style.display = 'none';
        $('login-screen').style.display = 'flex';
        $('login-email').value = '';
        $('login-password').value = '';
    }

    async function checkSession() {
        var result = await sb.auth.getSession();
        if (result.data && result.data.session) {
            var allowed = await verifyAdminAccess();
            if (allowed) {
                showAdminPanel(result.data.session.user);
            } else {
                await sb.auth.signOut();
                $('login-screen').style.display = 'flex';
                $('admin-panel').style.display = 'none';
            }
        } else {
            $('login-screen').style.display = 'flex';
            $('admin-panel').style.display = 'none';
        }
    }

    async function verifyAdminAccess() {
        var result = await sb.rpc('is_current_admin');
        if (!result.error) return result.data === true;

        // Compatibility while the security SQL has not been applied yet.
        // Real authorization must be enforced by the RLS policies in Supabase.
        if (result.error.message && result.error.message.indexOf('Could not find the function') >= 0) {
            console.warn('Supabase admin hardening RPC is missing. Apply supabase-security-hardening.sql.');
            return true;
        }
        return false;
    }

    function showAdminPanel(user) {
        $('login-screen').style.display = 'none';
        $('admin-panel').style.display = 'block';
        $('admin-email').textContent = user.email;
        loadDashboard();
        loadBarbers();
        loadServices();
        loadHolidays();
        loadAdmins();
        loadAppointments();
    }

    // ========== TAB NAVIGATION ==========

    function switchTab(tabName) {
        qsa('.nav-tab').forEach(function (t) { t.classList.remove('active'); });
        qsa('.tab-panel').forEach(function (p) { p.classList.remove('active'); });
        var tab = document.querySelector('.nav-tab[data-tab="' + tabName + '"]');
        var panel = $('tab-' + tabName);
        if (tab) tab.classList.add('active');
        if (panel) panel.classList.add('active');
    }

    // ========== DASHBOARD ==========

    async function loadDashboard() {
        var today = todayStr();
        var week = getWeekRange();
        var dashboardBarber = $('dashboard-barber') ? $('dashboard-barber').value : '';
        $('dashboard-date').textContent = formatDate(today);

        try {
            var todayAppts = await sb.from('appointments').select('*, barber:barbers(name)').eq('appointment_date', today).neq('status', 'cancelled');
            var weekAppts = await sb.from('appointments').select('id').gte('appointment_date', week.start).lte('appointment_date', week.end).neq('status', 'cancelled');
            var barbers = await sb.from('barbers').select('id, name').eq('active', true).order('sort_order').order('name');

            $('stat-today').textContent = todayAppts.data ? todayAppts.data.length : 0;
            $('stat-week').textContent = weekAppts.data ? weekAppts.data.length : 0;
            $('stat-barbers').textContent = barbers.data ? barbers.data.length : 0;

            var revenue = 0;
            if (todayAppts.data) {
                todayAppts.data.forEach(function (a) { revenue += Number(a.total_price || 0); });
            }
            $('stat-revenue').textContent = formatCurrency(revenue);

            renderDashboardBarberSummary(barbers.data || [], todayAppts.data || [], dashboardBarber);

            var visibleAppointments = todayAppts.data || [];
            if (dashboardBarber) {
                visibleAppointments = visibleAppointments.filter(function (a) { return a.barber_id === dashboardBarber; });
            }
            renderAppointmentsList('dashboard-appointments', visibleAppointments, true);
        } catch (err) {
            $('dashboard-appointments').innerHTML = '<p class="empty-state">Erro ao carregar dashboard.</p>';
        }
    }

    function renderDashboardBarberSummary(barbers, appointments, selectedBarber) {
        var container = $('dashboard-barber-summary');
        if (!container) return;

        if (!barbers.length) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = barbers.map(function (barber) {
            var items = appointments.filter(function (a) { return a.barber_id === barber.id; });
            items.sort(function (a, b) { return String(a.appointment_time).localeCompare(String(b.appointment_time)); });
            var next = items.length ? formatTime(items[0].appointment_time) : '--:--';
            return '<button type="button" class="barber-agenda-card ' + (selectedBarber === barber.id ? 'active' : '') + '" data-barber-id="' + barber.id + '">' +
                '<span class="barber-agenda-name">' + escapeHTML(barber.name) + '</span>' +
                '<strong>' + items.length + '</strong>' +
                '<span class="barber-agenda-meta">' + (items.length ? 'Próximo: ' + next : 'Sem agenda hoje') + '</span>' +
            '</button>';
        }).join('');

        qsa('.barber-agenda-card').forEach(function (card) {
            card.addEventListener('click', function () {
                var id = this.getAttribute('data-barber-id');
                $('dashboard-barber').value = selectedBarber === id ? '' : id;
                loadDashboard();
            });
        });
    }

    // ========== APPOINTMENTS ==========

    async function loadAppointments(page) {
        page = page || 1;
        currentPage = page;

        var query = sb.from('appointments').select('*, barber:barbers(name)', { count: 'exact' }).order('appointment_date', { ascending: false }).order('appointment_time', { ascending: false });

        var filterBarber = $('filter-barber').value;
        var filterStatus = $('filter-status').value;
        var filterDate = $('filter-date').value;

        if (filterBarber) query = query.eq('barber_id', filterBarber);
        if (filterStatus) query = query.eq('status', filterStatus);
        if (filterDate) query = query.eq('appointment_date', filterDate);

        var from = (page - 1) * ITEMS_PER_PAGE;
        var to = from + ITEMS_PER_PAGE - 1;
        query = query.range(from, to);

        try {
            var result = await query;
            renderAppointmentsList('appointments-list', result.data || [], false);
            renderPagination(result.count, page);
        } catch (err) {
            $('appointments-list').innerHTML = '<p class="empty-state">Erro ao carregar agendamentos.</p>';
        }
    }

    function renderAppointmentsList(containerId, appointments, isSimple) {
        var container = $(containerId);
        if (!appointments.length) {
            container.innerHTML = '<p class="empty-state">Nenhum agendamento encontrado.</p>';
            return;
        }

        container.innerHTML = appointments.map(function (a) {
            var statusClass = 'status-' + a.status;
            var statusLabel = { confirmed: 'Confirmado', pending: 'Pendente', cancelled: 'Cancelado', completed: 'Concluído' }[a.status] || a.status;
            var barberName = a.barber ? a.barber.name : 'Barbeiro';
            var services = (a.service_names || []).join(', ');
            var dateLabel = isSimple ? '' : '<span>' + formatDate(a.appointment_date) + '</span>';
            var obsHtml = a.obs ? '<span class="appointment-obs">&#9993; ' + escapeHTML(a.obs) + '</span>' : '';

            var actions = '';
            if (!isSimple) {
                if (a.status === 'confirmed' || a.status === 'pending') {
                    actions += '<button class="btn-icon success" onclick="AdminApp.completeAppointment(\'' + jsString(a.id) + '\')" title="Concluir">&#10003;</button>';
                    actions += '<button class="btn-icon danger" onclick="AdminApp.cancelAppointment(\'' + jsString(a.id) + '\')" title="Cancelar">&#10007;</button>';
                }
                if (a.status === 'confirmed') {
                    actions += '<button class="btn-icon" onclick="AdminApp.openWhatsApp(\'' + jsString(a.client_phone) + '\', \'' + jsString(a.client_name) + '\')" title="WhatsApp">&#128172;</button>';
                }
            }

            return '<div class="appointment-card">' +
                '<div class="appointment-info">' +
                    '<div class="appointment-time-badge">' + formatTime(a.appointment_time) + '</div>' +
                    '<div class="appointment-details">' +
                        '<div class="appointment-client">' + escapeHTML(a.client_name) + '</div>' +
                        '<div class="appointment-meta">' +
                            '<span>&#9998; ' + escapeHTML(barberName) + '</span>' +
                            '<span>' + escapeHTML(services) + '</span>' +
                            dateLabel +
                        '</div>' +
                        obsHtml +
                    '</div>' +
                '</div>' +
                '<div class="appointment-actions">' +
                    '<span class="status-badge ' + statusClass + '">' + escapeHTML(statusLabel) + '</span>' +
                    actions +
                '</div>' +
            '</div>';
        }).join('');
    }

    function renderPagination(total, current) {
        var container = $('appointments-pagination');
        if (!total || total <= ITEMS_PER_PAGE) {
            container.innerHTML = '';
            return;
        }
        var pages = Math.ceil(total / ITEMS_PER_PAGE);
        var html = '';
        if (current > 1) {
            html += '<button onclick="AdminApp.goToPage(' + (current - 1) + ')">&laquo;</button>';
        }
        for (var i = 1; i <= pages; i++) {
            if (pages > 7 && Math.abs(i - current) > 2 && i !== 1 && i !== pages) {
                if (i === current - 3 || i === current + 3) html += '<button disabled>...</button>';
                continue;
            }
            html += '<button class="' + (i === current ? 'active' : '') + '" onclick="AdminApp.goToPage(' + i + ')">' + i + '</button>';
        }
        if (current < pages) {
            html += '<button onclick="AdminApp.goToPage(' + (current + 1) + ')">&raquo;</button>';
        }
        container.innerHTML = html;
    }

    async function cancelAppointment(id) {
        showConfirm('Cancelar Agendamento', 'Tem certeza que deseja cancelar este agendamento?', async function () {
            var result = await sb.from('appointments').update({ status: 'cancelled' }).eq('id', id);
            if (result.error) {
                toast('Erro ao cancelar: ' + result.error.message, 'error');
            } else {
                toast('Agendamento cancelado.', 'success');
                loadDashboard();
                loadAppointments(currentPage);
            }
        });
    }

    async function completeAppointment(id) {
        var result = await sb.from('appointments').update({ status: 'completed' }).eq('id', id);
        if (result.error) {
            toast('Erro: ' + result.error.message, 'error');
        } else {
            toast('Agendamento concluído.', 'success');
            loadDashboard();
            loadAppointments(currentPage);
        }
    }

    function openWhatsApp(phone, name) {
        var clean = phone.replace(/\D/g, '');
        if (!clean.startsWith('55')) clean = '55' + clean;
        var text = 'Olá! Sou da Pereira\'s Barber Shop.';
        window.open('https://wa.me/' + clean + '?text=' + encodeURIComponent(text), '_blank');
    }

    // ========== BARBERS CRUD ==========

    var _barberSchedules = {};

    async function loadBarbers() {
        try {
            var result = await sb.from('barbers').select('*').order('sort_order').order('name');
            var barbers = result.data || [];

            var schedResult = await sb.from('barber_schedules').select('*');
            _barberSchedules = {};
            (schedResult.data || []).forEach(function (s) {
                if (!_barberSchedules[s.barber_id]) _barberSchedules[s.barber_id] = [];
                _barberSchedules[s.barber_id].push(s);
            });

            renderBarbers(barbers);

            var filterSelect = $('filter-barber');
            var currentVal = filterSelect.value;
            filterSelect.innerHTML = '<option value="">Todos os barbeiros</option>';
            barbers.forEach(function (b) {
                filterSelect.innerHTML += '<option value="' + escapeHTML(b.id) + '">' + escapeHTML(b.name) + '</option>';
            });
            filterSelect.value = currentVal;

            var dashboardSelect = $('dashboard-barber');
            if (dashboardSelect) {
                var currentDashboardVal = dashboardSelect.value;
                dashboardSelect.innerHTML = '<option value="">Todos os barbeiros</option>';
                barbers.filter(function (b) { return b.active; }).forEach(function (b) {
                    dashboardSelect.innerHTML += '<option value="' + escapeHTML(b.id) + '">' + escapeHTML(b.name) + '</option>';
                });
                dashboardSelect.value = currentDashboardVal;
            }
        } catch (err) {
            $('barbers-list').innerHTML = '<p class="empty-state">Erro ao carregar barbeiros.</p>';
        }
    }

    function getBarberScheduleSummary(barberId) {
        var scheds = _barberSchedules[barberId] || [];
        if (!scheds.length) return 'Sem horário configurado';
        scheds.sort(function (a, b) { return a.day_of_week - b.day_of_week; });
        var groups = [];
        var i = 0;
        while (i < scheds.length) {
            var start = scheds[i];
            var rangeEnd = start.day_of_week;
            var hours = formatTime(start.start_time) + '-' + formatTime(start.end_time);
            while (i + 1 < scheds.length && scheds[i + 1].day_of_week === rangeEnd + 1 && formatTime(scheds[i + 1].start_time) === formatTime(start.start_time) && formatTime(scheds[i + 1].end_time) === formatTime(start.end_time)) {
                rangeEnd = scheds[i + 1].day_of_week;
                i++;
            }
            if (start.day_of_week === rangeEnd) {
                groups.push(DAY_NAMES[start.day_of_week] + ' ' + hours);
            } else {
                groups.push(DAY_NAMES[start.day_of_week] + '-' + DAY_NAMES[rangeEnd] + ' ' + hours);
            }
            i++;
        }
        return groups.join(', ');
    }

    function renderBarbers(barbers) {
        var container = $('barbers-list');
        if (!barbers.length) {
            container.innerHTML = '<p class="empty-state">Nenhum barbeiro cadastrado.</p>';
            return;
        }
        container.innerHTML = barbers.map(function (b) {
            var badgeClass = b.active ? 'badge-active' : 'badge-inactive';
            var badgeText = b.active ? 'Ativo' : 'Inativo';
            var scheduleStr = getBarberScheduleSummary(b.id);
            var holidayBadge = b.works_holidays ? '<span class="card-badge badge-featured">&#128197; Trabalha feriados</span>' : '';
            return '<div class="manage-card ' + (b.active ? '' : 'inactive') + '">' +
                '<span class="card-badge ' + badgeClass + '">' + badgeText + '</span>' +
                holidayBadge +
                '<h4>' + escapeHTML(b.name) + '</h4>' +
                '<div class="card-detail">&#128336; ' + scheduleStr + '</div>' +
                '<div class="card-actions">' +
                    '<button class="btn-outline btn-sm" onclick="AdminApp.editBarber(\'' + jsString(b.id) + '\')">Editar</button>' +
                    '<button class="btn-outline btn-sm" onclick="AdminApp.toggleBarber(\'' + jsString(b.id) + '\', ' + !b.active + ')">' + (b.active ? 'Desativar' : 'Ativar') + '</button>' +
                    '<button class="btn-outline btn-sm btn-danger" onclick="AdminApp.deleteBarber(\'' + jsString(b.id) + '\')">Excluir</button>' +
                '</div>' +
            '</div>';
        }).join('');
    }

    function showBarberForm(barber, schedules) {
        var isEdit = !!barber;
        var title = isEdit ? 'Editar Barbeiro' : 'Novo Barbeiro';
        var name = isEdit ? barber.name : '';
        var worksHolidays = isEdit ? (barber.works_holidays || false) : false;
        var holidayChecked = worksHolidays ? 'checked' : '';

        var schedMap = {};
        (schedules || []).forEach(function (s) {
            schedMap[s.day_of_week] = { start: formatTime(s.start_time), end: formatTime(s.end_time) };
        });

        var defaultStart = '09:00';
        var defaultEnd = '19:00';
        var allDays = [
            { num: 0, name: 'Domingo' },
            { num: 1, name: 'Segunda' },
            { num: 2, name: 'Terça' },
            { num: 3, name: 'Quarta' },
            { num: 4, name: 'Quinta' },
            { num: 5, name: 'Sexta' },
            { num: 6, name: 'Sábado' }
        ];

        var scheduleHTML = '';
        allDays.forEach(function (day) {
            var hasDay = schedMap[day.num];
            var checked = hasDay ? 'checked' : '';
            var st = hasDay ? hasDay.start : defaultStart;
            var en = hasDay ? hasDay.end : defaultEnd;
            scheduleHTML += '<div class="schedule-row">' +
                '<label class="schedule-day-check"><input type="checkbox" class="day-check" data-day="' + day.num + '" ' + checked + '> ' + day.name + '</label>' +
                '<input type="time" class="schedule-time-start" data-day="' + day.num + '" value="' + st + '" ' + (hasDay ? '' : 'disabled') + '>' +
                '<span class="schedule-sep">às</span>' +
                '<input type="time" class="schedule-time-end" data-day="' + day.num + '" value="' + en + '" ' + (hasDay ? '' : 'disabled') + '>' +
            '</div>';
        });

        var html = '<div class="form-group"><label>Nome</label><input type="text" id="field-name" value="' + escapeHTML(name) + '" required></div>' +
            '<div class="form-group"><label>Horários por dia da semana</label><div class="schedule-grid">' + scheduleHTML + '</div></div>' +
            '<div class="form-group"><label class="checkbox-label"><input type="checkbox" id="field-works-holidays" ' + holidayChecked + '> Trabalha em feriados</label></div>';

        showModal(title, html, function () {
            qsa('.day-check').forEach(function (cb) {
                var day = cb.getAttribute('data-day');
                var startInput = document.querySelector('.schedule-time-start[data-day="' + day + '"]');
                var endInput = document.querySelector('.schedule-time-end[data-day="' + day + '"]');
                startInput.disabled = !cb.checked;
                endInput.disabled = !cb.checked;
            });
        }, async function () {
            var newName = $('field-name').value.trim();
            if (!newName) { toast('Nome é obrigatório.', 'error'); return; }

            var barberData = {
                name: newName,
                works_holidays: $('field-works-holidays').checked
            };

            var scheduleEntries = [];
            qsa('.day-check:checked').forEach(function (cb) {
                var day = parseInt(cb.getAttribute('data-day'));
                var st = document.querySelector('.schedule-time-start[data-day="' + day + '"]').value;
                var en = document.querySelector('.schedule-time-end[data-day="' + day + '"]').value;
                if (st && en) {
                    scheduleEntries.push({ day_of_week: day, start_time: st, end_time: en });
                }
            });

            if (!scheduleEntries.length) {
                toast('Selecione pelo menos um dia de trabalho.', 'error');
                return;
            }

            var result;
            if (isEdit) {
                result = await sb.from('barbers').update(barberData).eq('id', barber.id);
                if (!result.error) {
                    await sb.from('barber_schedules').delete().eq('barber_id', barber.id);
                    var insertData = scheduleEntries.map(function (s) {
                        return { barber_id: barber.id, day_of_week: s.day_of_week, start_time: s.start_time, end_time: s.end_time };
                    });
                    await sb.from('barber_schedules').insert(insertData);
                }
            } else {
                var maxResult = await sb.from('barbers').select('sort_order').order('sort_order', { ascending: false }).limit(1);
                barberData.sort_order = (maxResult.data && maxResult.data.length) ? (maxResult.data[0].sort_order + 1) : 1;
                barberData.active = true;
                result = await sb.from('barbers').insert(barberData).select();
                if (!result.error && result.data && result.data.length) {
                    var newBarberId = result.data[0].id;
                    var insertData = scheduleEntries.map(function (s) {
                        return { barber_id: newBarberId, day_of_week: s.day_of_week, start_time: s.start_time, end_time: s.end_time };
                    });
                    await sb.from('barber_schedules').insert(insertData);
                }
            }

            if (result.error) {
                toast('Erro: ' + result.error.message, 'error');
            } else {
                hideModal();
                toast(isEdit ? 'Barbeiro atualizado!' : 'Barbeiro adicionado!', 'success');
                loadBarbers();
                loadDashboard();
            }
        });
    }

    async function editBarber(id) {
        var result = await sb.from('barbers').select('*').eq('id', id).single();
        if (result.data) {
            var schedResult = await sb.from('barber_schedules').select('*').eq('barber_id', id);
            showBarberForm(result.data, schedResult.data || []);
        }
    }

    async function toggleBarber(id, active) {
        var result = await sb.from('barbers').update({ active: active }).eq('id', id);
        if (result.error) {
            toast('Erro: ' + result.error.message, 'error');
        } else {
            toast(active ? 'Barbeiro ativado!' : 'Barbeiro desativado.', 'success');
            loadBarbers();
            loadDashboard();
        }
    }

    function deleteBarber(id) {
        showConfirm('Excluir Barbeiro', 'Tem certeza? Todos os agendamentos deste barbeiro tambem serao excluidos.', async function () {
            var result = await sb.from('barbers').delete().eq('id', id);
            if (result.error) {
                toast('Erro: ' + result.error.message, 'error');
            } else {
                toast('Barbeiro excluido.', 'success');
                loadBarbers();
                loadDashboard();
            }
        });
    }

    // ========== SERVICES CRUD ==========

    async function loadServices() {
        try {
            var result = await sb.from('services').select('*').order('sort_order').order('name');
            renderServices(result.data || []);
        } catch (err) {
            $('services-list').innerHTML = '<p class="empty-state">Erro ao carregar servicos.</p>';
        }
    }

    function renderServices(services) {
        var container = $('services-list');
        if (!services.length) {
            container.innerHTML = '<p class="empty-state">Nenhum servico cadastrado.</p>';
            return;
        }
        container.innerHTML = services.map(function (s) {
            var badgeClass = s.active ? 'badge-active' : 'badge-inactive';
            var badgeText = s.active ? 'Ativo' : 'Inativo';
            var hours = Math.floor(s.duration_min / 60);
            var mins = s.duration_min % 60;
            var duration = '';
            if (hours > 0) duration += hours + 'h';
            if (mins > 0) duration += (hours > 0 ? ' ' : '') + mins + 'min';

            var featuredBadge = s.featured ? '<span class="card-badge badge-featured">&#11088; MAIS PEDIDO</span>' : '';
            return '<div class="manage-card ' + (s.active ? '' : 'inactive') + '">' +
                '<span class="card-badge ' + badgeClass + '">' + badgeText + '</span>' +
                featuredBadge +
                '<h4>' + escapeHTML(s.name) + '</h4>' +
                '<div class="card-price">' + formatCurrency(s.price) + '</div>' +
                '<div class="card-detail">&#9202; ' + duration + '</div>' +
                '<div class="card-actions">' +
                    '<button class="btn-outline btn-sm" onclick="AdminApp.editService(\'' + jsString(s.id) + '\')">Editar</button>' +
                    '<button class="btn-outline btn-sm" onclick="AdminApp.toggleService(\'' + jsString(s.id) + '\', ' + !s.active + ')">' + (s.active ? 'Desativar' : 'Ativar') + '</button>' +
                    '<button class="btn-outline btn-sm btn-danger" onclick="AdminApp.deleteService(\'' + jsString(s.id) + '\')">Excluir</button>' +
                '</div>' +
            '</div>';
        }).join('');
    }

    function showServiceForm(service) {
        var isEdit = !!service;
        var title = isEdit ? 'Editar Serviço' : 'Novo Serviço';
        var name = isEdit ? service.name : '';
        var price = isEdit ? service.price : '';
        var duration = isEdit ? service.duration_min : 60;
        var featured = isEdit ? (service.featured || false) : false;
        var featuredChecked = featured ? 'checked' : '';

        var html = '<div class="form-group"><label>Nome</label><input type="text" id="field-name" value="' + escapeHTML(name) + '" required></div>' +
            '<div class="form-group"><label>Preco (R$)</label><input type="number" id="field-price" value="' + price + '" step="0.01" min="0" required></div>' +
            '<div class="form-group"><label>Duracao (minutos)</label><input type="number" id="field-duration" value="' + duration + '" min="15" step="15" required></div>' +
            '<div class="form-group"><label class="checkbox-label"><input type="checkbox" id="field-featured" ' + featuredChecked + '> Marcar como "MAIS PEDIDO"</label></div>';

        showModal(title, html, async function () {
            var newName = $('field-name').value.trim();
            var newPrice = parseFloat($('field-price').value);
            var newDuration = parseInt($('field-duration').value);

            if (!newName || isNaN(newPrice)) {
                toast('Preencha todos os campos.', 'error');
                return;
            }

            var data = { name: newName, price: newPrice, duration_min: newDuration, featured: $('field-featured').checked };

            var result;
            if (isEdit) {
                result = await sb.from('services').update(data).eq('id', service.id);
            } else {
                var maxResult = await sb.from('services').select('sort_order').order('sort_order', { ascending: false }).limit(1);
                data.sort_order = (maxResult.data && maxResult.data.length) ? (maxResult.data[0].sort_order + 1) : 1;
                data.active = true;
                result = await sb.from('services').insert(data);
            }

            if (result.error) {
                toast('Erro: ' + result.error.message, 'error');
            } else {
                hideModal();
                toast(isEdit ? 'Serviço atualizado!' : 'Serviço adicionado!', 'success');
                loadServices();
            }
        });
    }

    async function editService(id) {
        var result = await sb.from('services').select('*').eq('id', id).single();
        if (result.data) showServiceForm(result.data);
    }

    async function toggleService(id, active) {
        var result = await sb.from('services').update({ active: active }).eq('id', id);
        if (result.error) {
            toast('Erro: ' + result.error.message, 'error');
        } else {
            toast(active ? 'Serviço ativado!' : 'Serviço desativado.', 'success');
            loadServices();
        }
    }

    function deleteService(id) {
        showConfirm('Excluir Serviço', 'Tem certeza que deseja excluir este serviço?', async function () {
            var result = await sb.from('services').delete().eq('id', id);
            if (result.error) {
                toast('Erro: ' + result.error.message, 'error');
            } else {
                toast('Serviço excluído.', 'success');
                loadServices();
            }
        });
    }

    // ========== HOLIDAYS CRUD ==========

    async function loadHolidays() {
        try {
            var result = await sb.from('holidays').select('*').order('date', { ascending: true });
            renderHolidays(result.data || []);
        } catch (err) {
            $('holidays-list').innerHTML = '<p class="empty-state">Erro ao carregar feriados.</p>';
        }
    }

    function renderHolidays(holidays) {
        var container = $('holidays-list');
        if (!holidays.length) {
            container.innerHTML = '<p class="empty-state">Nenhum feriado cadastrado.</p>';
            return;
        }
        container.innerHTML = holidays.map(function (h) {
            var recurringBadge = h.recurring ? '<span class="card-badge badge-featured">&#128260; Recorrente</span>' : '';
            return '<div class="manage-card">' +
                recurringBadge +
                '<h4>' + formatDate(h.date) + '</h4>' +
                '<div class="card-detail">' + escapeHTML(h.description || 'Feriado') + '</div>' +
                '<div class="card-actions">' +
                    '<button class="btn-outline btn-sm" onclick="AdminApp.editHoliday(\'' + jsString(h.id) + '\')">Editar</button>' +
                    '<button class="btn-outline btn-sm btn-danger" onclick="AdminApp.deleteHoliday(\'' + jsString(h.id) + '\')">Excluir</button>' +
                '</div>' +
            '</div>';
        }).join('');
    }

    function showHolidayForm(holiday) {
        var isEdit = !!holiday;
        var title = isEdit ? 'Editar Feriado' : 'Novo Feriado';
        var date = isEdit ? holiday.date : '';
        var desc = isEdit ? (holiday.description || '') : '';
        var recurring = isEdit ? (holiday.recurring || false) : false;
        var recurringChecked = recurring ? 'checked' : '';

        var html = '<div class="form-group"><label>Data</label><input type="date" id="field-holiday-date" value="' + escapeHTML(date) + '" required></div>' +
            '<div class="form-group"><label>Descrição</label><input type="text" id="field-holiday-desc" value="' + escapeHTML(desc) + '" placeholder="Ex: Natal, Ano Novo..."></div>' +
            '<div class="form-group"><label class="checkbox-label"><input type="checkbox" id="field-holiday-recurring" ' + recurringChecked + '> Recorrente (repete todo ano)</label></div>';

        showModal(title, html, async function () {
            var newDate = $('field-holiday-date').value;
            var newDesc = $('field-holiday-desc').value.trim();
            var newRecurring = $('field-holiday-recurring').checked;

            if (!newDate) {
                toast('Informe a data.', 'error');
                return;
            }

            var data = { date: newDate, description: newDesc || null, recurring: newRecurring };

            var result;
            if (isEdit) {
                result = await sb.from('holidays').update(data).eq('id', holiday.id);
            } else {
                result = await sb.from('holidays').insert(data);
            }

            if (result.error) {
                toast('Erro: ' + result.error.message, 'error');
            } else {
                hideModal();
                toast(isEdit ? 'Feriado atualizado!' : 'Feriado adicionado!', 'success');
                loadHolidays();
            }
        });
    }

    async function editHoliday(id) {
        var result = await sb.from('holidays').select('*').eq('id', id).single();
        if (result.data) showHolidayForm(result.data);
    }

    function deleteHoliday(id) {
        showConfirm('Excluir Feriado', 'Tem certeza que deseja excluir este feriado?', async function () {
            var result = await sb.from('holidays').delete().eq('id', id);
            if (result.error) {
                toast('Erro: ' + result.error.message, 'error');
            } else {
                toast('Feriado excluído.', 'success');
                loadHolidays();
            }
        });
    }

    // ========== ADMINS ==========

    async function loadAdmins() {
        try {
            var result = await sb.from('barbers').select('*');
            var users = result.data || [];
            var container = $('admins-list');

            var session = await sb.auth.getSession();
            var currentEmail = session.data.session ? session.data.session.user.email : '';

            container.innerHTML = '<div class="admin-card">' +
                '<div class="admin-card-info">' +
                    '<div class="admin-avatar">' + escapeHTML(currentEmail.charAt(0).toUpperCase()) + '</div>' +
                    '<div><div class="admin-name">' + escapeHTML(currentEmail) + '</div><div class="admin-role">Admin autorizado</div></div>' +
                '</div>' +
                '<span class="status-badge status-confirmed">Ativo</span>' +
            '</div>' +
            '<p class="empty-state" style="margin-top:24px;font-size:0.8rem;">Novos administradores devem ser criados pelo Supabase Dashboard e liberados na tabela admins.</p>';
        } catch (err) {
            $('admins-list').innerHTML = '<p class="empty-state">Erro ao carregar administradores.</p>';
        }
    }

    function showAddAdminForm() {
        var html = '<p class="empty-state" style="padding:8px 0;text-align:left;color:var(--gray-600);">Por segurança, este painel não cria usuários pelo navegador. Crie o usuário em Authentication &gt; Users no Supabase e depois rode o insert na tabela <strong>admins</strong> usando o UID criado.</p>' +
            '<pre class="code-snippet">insert into public.admins (user_id, email)\nvalues (\'UID_DO_USUARIO\', \'email@exemplo.com\');</pre>';

        showModal('Novo Administrador', html, function () {
            hideModal();
        });
    }

    // ========== EVENT LISTENERS ==========

    function init() {
        $('login-form').addEventListener('submit', handleLogin);
        $('btn-logout').addEventListener('click', handleLogout);

        var toggleBtn = $('toggle-password');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', function () {
                var input = $('login-password');
                var icon = this.querySelector('i');
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.className = 'fas fa-eye-slash';
                } else {
                    input.type = 'password';
                    icon.className = 'fas fa-eye';
                }
            });
        }

        qsa('.nav-tab').forEach(function (tab) {
            tab.addEventListener('click', function () {
                switchTab(this.getAttribute('data-tab'));
            });
        });

        $('modal-close').addEventListener('click', hideModal);
        $('modal-cancel').addEventListener('click', hideModal);
        $('modal-overlay').addEventListener('click', function (e) {
            if (e.target === this) hideModal();
        });

        $('confirm-close').addEventListener('click', hideConfirm);
        $('confirm-cancel').addEventListener('click', hideConfirm);
        $('confirm-overlay').addEventListener('click', function (e) {
            if (e.target === this) hideConfirm();
        });

        $('btn-add-barber').addEventListener('click', function () { showBarberForm(null); });
        $('btn-add-service').addEventListener('click', function () { showServiceForm(null); });
        $('btn-add-holiday').addEventListener('click', function () { showHolidayForm(null); });
        $('btn-add-admin').addEventListener('click', showAddAdminForm);

        $('filter-barber').addEventListener('change', function () { loadAppointments(1); });
        $('dashboard-barber').addEventListener('change', function () { loadDashboard(); });
        $('filter-status').addEventListener('change', function () { loadAppointments(1); });
        $('filter-date').addEventListener('change', function () { loadAppointments(1); });
        $('btn-clear-filters').addEventListener('click', function () {
            $('filter-barber').value = '';
            $('filter-status').value = '';
            $('filter-date').value = '';
            loadAppointments(1);
        });

        checkSession();
    }

    window.AdminApp = {
        cancelAppointment: cancelAppointment,
        completeAppointment: completeAppointment,
        openWhatsApp: openWhatsApp,
        editBarber: editBarber,
        toggleBarber: toggleBarber,
        deleteBarber: deleteBarber,
        editService: editService,
        toggleService: toggleService,
        deleteService: deleteService,
        editHoliday: editHoliday,
        deleteHoliday: deleteHoliday,
        goToPage: function (p) { loadAppointments(p); }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
