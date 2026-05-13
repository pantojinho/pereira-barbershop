(function () {
    'use strict';

    var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    var ITEMS_PER_PAGE = 15;
    var currentPage = 1;

    function $(id) { return document.getElementById(id); }
    function qs(sel) { return document.querySelector(sel); }
    function qsa(sel) { return document.querySelectorAll(sel); }

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
        1: 'Seg', 2: 'Ter', 3: 'Qua', 4: 'Qui', 5: 'Sex', 6: 'Sab'
    };

    function toast(msg, type) {
        var el = document.createElement('div');
        el.className = 'toast ' + (type || '');
        el.textContent = msg;
        $('toast-container').appendChild(el);
        setTimeout(function () { el.remove(); }, 3000);
    }

    function showModal(title, bodyHTML, onSave) {
        $('modal-title').textContent = title;
        $('modal-body').innerHTML = bodyHTML;
        $('modal-overlay').style.display = 'flex';
        $('modal-save').onclick = function () {
            if (onSave) onSave();
        };
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
        errEl.style.display = 'none';

        if (!email || !password) {
            errEl.textContent = 'Preencha email e senha.';
            errEl.style.display = 'block';
            return;
        }

        try {
            var result = await sb.auth.signInWithPassword({ email: email, password: password });
            if (result.error) throw result.error;
            showAdminPanel(result.data.user);
        } catch (err) {
            errEl.textContent = err.message || 'Email ou senha incorretos.';
            errEl.style.display = 'block';
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
            showAdminPanel(result.data.session.user);
        } else {
            $('login-screen').style.display = 'flex';
            $('admin-panel').style.display = 'none';
        }
    }

    function showAdminPanel(user) {
        $('login-screen').style.display = 'none';
        $('admin-panel').style.display = 'block';
        $('admin-email').textContent = user.email;
        loadDashboard();
        loadBarbers();
        loadServices();
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
        $('dashboard-date').textContent = formatDate(today);

        try {
            var todayAppts = await sb.from('appointments').select('*, barber:barbers(name)').eq('appointment_date', today).neq('status', 'cancelled');
            var weekAppts = await sb.from('appointments').select('id').gte('appointment_date', week.start).lte('appointment_date', week.end).neq('status', 'cancelled');
            var barbers = await sb.from('barbers').select('id').eq('active', true);

            $('stat-today').textContent = todayAppts.data ? todayAppts.data.length : 0;
            $('stat-week').textContent = weekAppts.data ? weekAppts.data.length : 0;
            $('stat-barbers').textContent = barbers.data ? barbers.data.length : 0;

            var revenue = 0;
            if (todayAppts.data) {
                todayAppts.data.forEach(function (a) { revenue += Number(a.total_price || 0); });
            }
            $('stat-revenue').textContent = formatCurrency(revenue);

            renderAppointmentsList('dashboard-appointments', todayAppts.data || [], true);
        } catch (err) {
            $('dashboard-appointments').innerHTML = '<p class="empty-state">Erro ao carregar dashboard.</p>';
        }
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
            var statusLabel = { confirmed: 'Confirmado', pending: 'Pendente', cancelled: 'Cancelado', completed: 'Concluido' }[a.status] || a.status;
            var barberName = a.barber ? a.barber.name : 'Barbeiro';
            var services = (a.service_names || []).join(', ');
            var dateLabel = isSimple ? '' : '<span>' + formatDate(a.appointment_date) + '</span>';

            var actions = '';
            if (!isSimple) {
                if (a.status === 'confirmed' || a.status === 'pending') {
                    actions += '<button class="btn-icon success" onclick="AdminApp.completeAppointment(\'' + a.id + '\')" title="Concluir">&#10003;</button>';
                    actions += '<button class="btn-icon danger" onclick="AdminApp.cancelAppointment(\'' + a.id + '\')" title="Cancelar">&#10007;</button>';
                }
                if (a.status === 'confirmed') {
                    actions += '<button class="btn-icon" onclick="AdminApp.openWhatsApp(\'' + a.client_phone + '\', \'' + encodeURIComponent(a.client_name) + '\')" title="WhatsApp">&#128172;</button>';
                }
            }

            return '<div class="appointment-card">' +
                '<div class="appointment-info">' +
                    '<div class="appointment-time-badge">' + formatTime(a.appointment_time) + '</div>' +
                    '<div class="appointment-details">' +
                        '<div class="appointment-client">' + a.client_name + '</div>' +
                        '<div class="appointment-meta">' +
                            '<span>&#9998; ' + barberName + '</span>' +
                            '<span>' + services + '</span>' +
                            dateLabel +
                        '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="appointment-actions">' +
                    '<span class="status-badge ' + statusClass + '">' + statusLabel + '</span>' +
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
            toast('Agendamento concluido.', 'success');
            loadDashboard();
            loadAppointments(currentPage);
        }
    }

    function openWhatsApp(phone, name) {
        var clean = phone.replace(/\D/g, '');
        if (!clean.startsWith('55')) clean = '55' + clean;
        window.open('https://wa.me/' + clean + '?text=Olá! Sou da Pereira\'s Barber Shop.', '_blank');
    }

    // ========== BARBERS CRUD ==========

    async function loadBarbers() {
        try {
            var result = await sb.from('barbers').select('*').order('sort_order').order('name');
            renderBarbers(result.data || []);

            var filterSelect = $('filter-barber');
            var currentVal = filterSelect.value;
            filterSelect.innerHTML = '<option value="">Todos os barbeiros</option>';
            (result.data || []).forEach(function (b) {
                filterSelect.innerHTML += '<option value="' + b.id + '">' + b.name + '</option>';
            });
            filterSelect.value = currentVal;
        } catch (err) {
            $('barbers-list').innerHTML = '<p class="empty-state">Erro ao carregar barbeiros.</p>';
        }
    }

    function renderBarbers(barbers) {
        var container = $('barbers-list');
        if (!barbers.length) {
            container.innerHTML = '<p class="empty-state">Nenhum barbeiro cadastrado.</p>';
            return;
        }
        container.innerHTML = barbers.map(function (b) {
            var days = (b.work_days || []).map(function (d) { return DAY_NAMES[d] || d; }).join(', ');
            var badgeClass = b.active ? 'badge-active' : 'badge-inactive';
            var badgeText = b.active ? 'Ativo' : 'Inativo';
            return '<div class="manage-card ' + (b.active ? '' : 'inactive') + '">' +
                '<span class="card-badge ' + badgeClass + '">' + badgeText + '</span>' +
                '<h4>' + b.name + '</h4>' +
                '<div class="card-detail">&#128336; ' + formatTime(b.schedule_start) + ' - ' + formatTime(b.schedule_end) + '</div>' +
                '<div class="card-detail">&#128197; ' + days + '</div>' +
                '<div class="card-actions">' +
                    '<button class="btn-outline btn-sm" onclick="AdminApp.editBarber(\'' + b.id + '\')">Editar</button>' +
                    '<button class="btn-outline btn-sm" onclick="AdminApp.toggleBarber(\'' + b.id + '\', ' + !b.active + ')">' + (b.active ? 'Desativar' : 'Ativar') + '</button>' +
                    '<button class="btn-outline btn-sm btn-danger" onclick="AdminApp.deleteBarber(\'' + b.id + '\')">Excluir</button>' +
                '</div>' +
            '</div>';
        }).join('');
    }

    function showBarberForm(barber) {
        var isEdit = !!barber;
        var title = isEdit ? 'Editar Barbeiro' : 'Novo Barbeiro';
        var name = isEdit ? barber.name : '';
        var start = isEdit ? formatTime(barber.schedule_start) : '09:00';
        var end = isEdit ? formatTime(barber.schedule_end) : '19:00';
        var workDays = isEdit ? (barber.work_days || []) : [1, 2, 3, 4, 5, 6];

        var daysHTML = '';
        for (var d = 1; d <= 6; d++) {
            var checked = workDays.indexOf(d) >= 0 ? 'checked' : '';
            daysHTML += '<label class="work-day-option"><input type="checkbox" name="work_day" value="' + d + '" ' + checked + '> ' + DAY_NAMES[d] + '</label>';
        }

        var html = '<div class="form-group"><label>Nome</label><input type="text" id="field-name" value="' + name + '" required></div>' +
            '<div class="form-group"><label>Horario Inicio</label><input type="time" id="field-start" value="' + start + '"></div>' +
            '<div class="form-group"><label>Horario Fim</label><input type="time" id="field-end" value="' + end + '"></div>' +
            '<div class="form-group"><label>Dias de Trabalho</label><div class="work-days-grid">' + daysHTML + '</div></div>';

        showModal(title, html, async function () {
            var newName = $('field-name').value.trim();
            if (!newName) { toast('Nome e obrigatorio.', 'error'); return; }

            var selectedDays = [];
            qsa('input[name="work_day"]:checked').forEach(function (cb) {
                selectedDays.push(parseInt(cb.value));
            });
            selectedDays.sort();

            var data = {
                name: newName,
                schedule_start: $('field-start').value,
                schedule_end: $('field-end').value,
                work_days: selectedDays
            };

            var result;
            if (isEdit) {
                result = await sb.from('barbers').update(data).eq('id', barber.id);
            } else {
                var maxResult = await sb.from('barbers').select('sort_order').order('sort_order', { ascending: false }).limit(1);
                data.sort_order = (maxResult.data && maxResult.data.length) ? (maxResult.data[0].sort_order + 1) : 1;
                data.active = true;
                result = await sb.from('barbers').insert(data);
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
        if (result.data) showBarberForm(result.data);
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

            return '<div class="manage-card ' + (s.active ? '' : 'inactive') + '">' +
                '<span class="card-badge ' + badgeClass + '">' + badgeText + '</span>' +
                '<h4>' + s.name + '</h4>' +
                '<div class="card-price">' + formatCurrency(s.price) + '</div>' +
                '<div class="card-detail">&#9202; ' + duration + '</div>' +
                '<div class="card-actions">' +
                    '<button class="btn-outline btn-sm" onclick="AdminApp.editService(\'' + s.id + '\')">Editar</button>' +
                    '<button class="btn-outline btn-sm" onclick="AdminApp.toggleService(\'' + s.id + '\', ' + !s.active + ')">' + (s.active ? 'Desativar' : 'Ativar') + '</button>' +
                    '<button class="btn-outline btn-sm btn-danger" onclick="AdminApp.deleteService(\'' + s.id + '\')">Excluir</button>' +
                '</div>' +
            '</div>';
        }).join('');
    }

    function showServiceForm(service) {
        var isEdit = !!service;
        var title = isEdit ? 'Editar Servico' : 'Novo Servico';
        var name = isEdit ? service.name : '';
        var price = isEdit ? service.price : '';
        var duration = isEdit ? service.duration_min : 60;

        var html = '<div class="form-group"><label>Nome</label><input type="text" id="field-name" value="' + name + '" required></div>' +
            '<div class="form-group"><label>Preco (R$)</label><input type="number" id="field-price" value="' + price + '" step="0.01" min="0" required></div>' +
            '<div class="form-group"><label>Duracao (minutos)</label><input type="number" id="field-duration" value="' + duration + '" min="15" step="15" required></div>';

        showModal(title, html, async function () {
            var newName = $('field-name').value.trim();
            var newPrice = parseFloat($('field-price').value);
            var newDuration = parseInt($('field-duration').value);

            if (!newName || isNaN(newPrice)) {
                toast('Preencha todos os campos.', 'error');
                return;
            }

            var data = { name: newName, price: newPrice, duration_min: newDuration };

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
                toast(isEdit ? 'Servico atualizado!' : 'Servico adicionado!', 'success');
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
            toast(active ? 'Servico ativado!' : 'Servico desativado.', 'success');
            loadServices();
        }
    }

    function deleteService(id) {
        showConfirm('Excluir Servico', 'Tem certeza que deseja excluir este servico?', async function () {
            var result = await sb.from('services').delete().eq('id', id);
            if (result.error) {
                toast('Erro: ' + result.error.message, 'error');
            } else {
                toast('Servico excluido.', 'success');
                loadServices();
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
                    '<div class="admin-avatar">' + currentEmail.charAt(0).toUpperCase() + '</div>' +
                    '<div><div class="admin-name">' + currentEmail + '</div><div class="admin-role">Admin Principal</div></div>' +
                '</div>' +
                '<span class="status-badge status-confirmed">Ativo</span>' +
            '</div>' +
            '<p class="empty-state" style="margin-top:24px;font-size:0.8rem;">Para adicionar novos administradores, use o botao abaixo. Eles receberao um email para definir a senha.</p>';
        } catch (err) {
            $('admins-list').innerHTML = '<p class="empty-state">Erro ao carregar administradores.</p>';
        }
    }

    function showAddAdminForm() {
        var html = '<div class="form-group"><label>Email</label><input type="email" id="field-email" placeholder="novo@admin.com" required></div>' +
            '<div class="form-group"><label>Senha</label><input type="password" id="field-password" placeholder="Minimo 6 caracteres" required></div>';

        showModal('Novo Administrador', html, async function () {
            var email = $('field-email').value.trim();
            var password = $('field-password').value;

            if (!email || !password || password.length < 6) {
                toast('Email e senha (minimo 6 caracteres) sao obrigatorios.', 'error');
                return;
            }

            var result = await sb.auth.signUp({ email: email, password: password });
            if (result.error) {
                toast('Erro: ' + result.error.message, 'error');
            } else {
                hideModal();
                toast('Admin criado! Ele pode fazer login agora.', 'success');
                loadAdmins();
            }
        });
    }

    // ========== EVENT LISTENERS ==========

    function init() {
        $('login-form').addEventListener('submit', handleLogin);
        $('btn-logout').addEventListener('click', handleLogout);

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
        $('btn-add-admin').addEventListener('click', showAddAdminForm);

        $('filter-barber').addEventListener('change', function () { loadAppointments(1); });
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
        goToPage: function (p) { loadAppointments(p); }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
