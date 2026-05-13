(function () {
    'use strict';

    var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    var ITEMS_PER_PAGE = 15;
    var currentPage = 1;

    var currentUserRole = 'admin';
    var currentUserBarberId = null;
    var currentUserBarberName = null;

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
                errEl.textContent = 'Seu usuário não tem permissão de acesso.';
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
        try {
            var rpcResult = await sb.rpc('is_current_admin');
            if (rpcResult.data === true) {
                // Buscar role do usuario na tabela admins
                var session = await sb.auth.getSession();
                var userId = session.data.session.user.id;
                var adminResult = await sb.from('admins').select('role, barber_id').eq('user_id', userId).single();
                if (adminResult.data) {
                    currentUserRole = adminResult.data.role || 'admin';
                    currentUserBarberId = adminResult.data.barber_id || null;
                }
                return true;
            }
            // Compatibility while the security SQL has not been applied yet.
            if (rpcResult.error && rpcResult.error.message && rpcResult.error.message.indexOf('Could not find the function') >= 0) {
                console.warn('Supabase admin hardening RPC is missing. Apply supabase-security-hardening.sql.');
                return true;
            }
        } catch (err) {
            // Fallback: check admins table directly
            try {
                var session2 = await sb.auth.getSession();
                if (session2.data && session2.data.session) {
                    var userId2 = session2.data.session.user.id;
                    var adminResult2 = await sb.from('admins').select('role, barber_id').eq('user_id', userId2).single();
                    if (adminResult2.data) {
                        currentUserRole = adminResult2.data.role || 'admin';
                        currentUserBarberId = adminResult2.data.barber_id || null;
                        return true;
                    }
                }
            } catch (e) {}
        }
        return false;
    }

    function showAdminPanel(user) {
        $('login-screen').style.display = 'none';
        $('admin-panel').style.display = 'block';
        $('admin-email').textContent = user.email;

        // Se barbeiro, esconder abas restritas e filtrar
        if (currentUserRole === 'barber') {
            qsa('.nav-tab').forEach(function(tab) {
                var tabName = tab.getAttribute('data-tab');
                if (tabName !== 'dashboard' && tabName !== 'appointments') {
                    tab.style.display = 'none';
                }
            });
            // Mudar subtítulo
            var subtitle = qs('.header-subtitle');
            if (subtitle) subtitle.textContent = 'Minha Agenda';
            // Buscar nome do barbeiro
            if (currentUserBarberId) {
                sb.from('barbers').select('name').eq('id', currentUserBarberId).single().then(function(r) {
                    if (r.data) {
                        currentUserBarberName = r.data.name;
                        var subtitle2 = qs('.header-subtitle');
                        if (subtitle2) subtitle2.textContent = 'Agenda de ' + r.data.name;
                    }
                });
            }
        }

        loadDashboard();
        loadBarbers();
        loadServices();
        loadProducts();
        loadProductOrders();
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
        // Se barbeiro logado, forçar filtro para o próprio barbeiro
        if (currentUserRole === 'barber' && currentUserBarberId) {
            dashboardBarber = currentUserBarberId;
        }
        $('dashboard-date').textContent = formatDate(today);

        try {
            var todayAppts = await sb.from('appointments').select('*, barber:barbers(name)').eq('appointment_date', today).neq('status', 'cancelled');
            var weekAppts = await sb.from('appointments').select('id').gte('appointment_date', week.start).lte('appointment_date', week.end).neq('status', 'cancelled');
            var barbers = await sb.from('barbers').select('id, name').eq('active', true).order('sort_order').order('name');

            // Filtrar por barbeiro se for role barber
            if (currentUserRole === 'barber' && currentUserBarberId) {
                if (todayAppts.data) {
                    todayAppts.data = todayAppts.data.filter(function(a) { return a.barber_id === currentUserBarberId; });
                }
                if (weekAppts.data) {
                    weekAppts.data = weekAppts.data.filter(function(a) { return a.barber_id === currentUserBarberId; });
                }
            }

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

        // Se barbeiro, filtrar automaticamente para o próprio barbeiro
        if (currentUserRole === 'barber' && currentUserBarberId) {
            query = query.eq('barber_id', currentUserBarberId);
        }

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
            var phoneLabel = isSimple ? '' : '<span>&#128222; ' + formatPhone(a.client_phone) + '</span>';
            var obsHtml = a.obs ? '<span class="appointment-obs">&#9993; ' + escapeHTML(a.obs) + '</span>' : '';

            return '<div class="appointment-card" onclick="AdminApp.showAppointmentDetails(\'' + jsString(a.id) + '\')">' +
                '<div class="appointment-info">' +
                    '<div class="appointment-time-badge">' + formatTime(a.appointment_time) + '</div>' +
                    '<div class="appointment-details">' +
                        '<div class="appointment-client">' + escapeHTML(a.client_name) + '</div>' +
                        '<div class="appointment-meta">' +
                            '<span>&#9998; ' + escapeHTML(barberName) + '</span>' +
                            '<span>' + escapeHTML(services) + '</span>' +
                            dateLabel +
                            phoneLabel +
                        '</div>' +
                        obsHtml +
                    '</div>' +
                '</div>' +
                '<div class="appointment-actions">' +
                    '<span class="status-badge ' + statusClass + '">' + escapeHTML(statusLabel) + '</span>' +
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

    async function completeAppointment(id) {
        try {
            var result = await sb.from('appointments').update({ status: 'completed' }).eq('id', id);
            if (result.error) {
                toast('Erro: ' + result.error.message, 'error');
            } else {
                toast('Agendamento concluído!', 'success');
                closeAppointmentDetails();
                loadDashboard();
                loadAppointments(currentPage);
            }
        } catch (err) {
            console.error(err);
            toast('Erro ao concluir agendamento.', 'error');
        }
    }

    function openWhatsApp(phone, name) {
        var clean = phone.replace(/\D/g, '');
        if (!clean.startsWith('55')) clean = '55' + clean;
        var text = 'Olá! Sou da Pereira\'s Barber Shop.';
        window.open('https://wa.me/' + clean + '?text=' + encodeURIComponent(text), '_blank');
    }

    async function showAppointmentDetails(id) {
        try {
            var result = await sb.from('appointments').select('*, barber:barbers(name)').eq('id', id).single();
            if (!result.data) {
                toast('Agendamento não encontrado.', 'error');
                return;
            }

            var a = result.data;
            var statusLabel = { confirmed: 'Confirmado', pending: 'Pendente', cancelled: 'Cancelado', completed: 'Concluído' }[a.status] || a.status;
            var statusClass = 'status-' + a.status;

            var services = (a.service_names || []).join(', ');
            var barberName = a.barber ? a.barber.name : 'Barbeiro';
            var phone = formatPhone(a.client_phone);
            var date = formatDate(a.appointment_date);
            var time = formatTime(a.appointment_time);
            var obs = a.obs || 'Nenhuma';

            var whatsappLink = getWhatsAppLink(a.client_phone, a.client_name);
            var cancelWhatsappLink = getWhatsAppCancelLink(a);

            var bodyHTML = '<div class="appointment-status-badge-large ' + statusClass + '">' + escapeHTML(statusLabel) + '</div>' +
                '<div class="appointment-detail-item">' +
                    '<div class="appointment-detail-label">Cliente</div>' +
                    '<div class="appointment-detail-value highlight">' + escapeHTML(a.client_name) + '</div>' +
                '</div>' +
                '<div class="appointment-detail-item">' +
                    '<div class="appointment-detail-label">Telefone</div>' +
                    '<div class="appointment-detail-value">' + escapeHTML(phone) + '</div>' +
                    '<a href="' + whatsappLink + '" class="appointment-detail-whatsapp-link" target="_blank"><i class="fab fa-whatsapp"></i> WhatsApp</a>' +
                '</div>' +
                '<div class="appointment-detail-item">' +
                    '<div class="appointment-detail-label">Barbeiro</div>' +
                    '<div class="appointment-detail-value">' + escapeHTML(barberName) + '</div>' +
                '</div>' +
                '<div class="appointment-detail-item">' +
                    '<div class="appointment-detail-label">Serviço(s)</div>' +
                    '<div class="appointment-detail-value">' + escapeHTML(services) + '</div>' +
                '</div>' +
                '<div class="appointment-detail-item">' +
                    '<div class="appointment-detail-label">Data</div>' +
                    '<div class="appointment-detail-value">' + date + '</div>' +
                '</div>' +
                '<div class="appointment-detail-item">' +
                    '<div class="appointment-detail-label">Horário</div>' +
                    '<div class="appointment-detail-value highlight">' + time + '</div>' +
                '</div>' +
                '<div class="appointment-detail-item">' +
                    '<div class="appointment-detail-label">Total</div>' +
                    '<div class="appointment-detail-value highlight">' + formatCurrency(a.total_price || 0) + '</div>' +
                '</div>' +
                '<div class="appointment-detail-item">' +
                    '<div class="appointment-detail-label">Observações</div>' +
                    '<div class="appointment-detail-value">' + escapeHTML(obs) + '</div>' +
                '</div>';

            $('appointment-details-body').innerHTML = bodyHTML;

            var footerHTML = '';
            if (a.status === 'pending') {
                footerHTML += '<button onclick="AdminApp.confirmAppointment(\'' + jsString(a.id) + '\')" class="btn-primary">Confirmar</button>';
            }
            if (a.status === 'confirmed' || a.status === 'pending') {
                footerHTML += '<button onclick="AdminApp.rescheduleAppointment(\'' + jsString(a.id) + '\')" class="btn-outline"><i class="fas fa-calendar-alt"></i> Reagendar</button>';
                footerHTML += '<button onclick="AdminApp.completeAppointment(\'' + jsString(a.id) + '\')" class="btn-primary">Concluir</button>';
                footerHTML += '<button onclick="AdminApp.cancelAppointmentFromDetails(\'' + jsString(a.id) + '\')" class="btn-outline btn-danger">Cancelar</button>';
            }
            if (a.status === 'cancelled' || a.status === 'completed') {
                footerHTML += '<button onclick="AdminApp.deleteAppointment(\'' + jsString(a.id) + '\')" class="btn-outline btn-danger">Remover do Histórico</button>';
            }
            footerHTML += '<button onclick="AdminApp.closeAppointmentDetails()" class="btn-outline">Fechar</button>';

            $('appointment-details-footer').innerHTML = '<div class="appointment-detail-actions">' + footerHTML + '</div>';

            $('appointment-details-overlay').style.display = 'flex';

            window.currentAppointmentId = id;
        } catch (err) {
            console.error(err);
            toast('Erro ao carregar detalhes do agendamento.', 'error');
        }
    }

    function closeAppointmentDetails() {
        $('appointment-details-overlay').style.display = 'none';
        window.currentAppointmentId = null;
    }

    function getWhatsAppLink(phone, name) {
        var clean = phone.replace(/\D/g, '');
        if (!clean.startsWith('55')) clean = '55' + clean;
        var text = 'Olá, ' + escapeHTML(name) + '! Sou da Pereira\'s Barber Shop.';
        return 'https://wa.me/' + clean + '?text=' + encodeURIComponent(text);
    }

    function getWhatsAppCancelLink(appointment) {
        var clean = appointment.client_phone.replace(/\D/g, '');
        if (!clean.startsWith('55')) clean = '55' + clean;
        var text = 'Olá, ' + escapeHTML(appointment.client_name) + '! 😊 Gostaríamos de confirmar com você sobre seu agendamento de ' + escapeHTML((appointment.service_names || []).join(', ')) + ' em ' + formatDate(appointment.appointment_date) + ' às ' + formatTime(appointment.appointment_time) + ' com ' + escapeHTML(appointment.barber ? appointment.barber.name : 'Barbeiro') + '.\n\nAlgum imprevisto aconteceu e precisamos fazer um ajuste. Pedimos mil desculpas! ❤️\n\nVocê pode reagendar pelo site: https://pereira-barbershop.vercel.app/agendar.html\n\nAgradecemos desde já! ✂️';
        return 'https://wa.me/' + clean + '?text=' + encodeURIComponent(text);
    }

    async function confirmAppointment(id) {
        try {
            var result = await sb.from('appointments').update({ status: 'confirmed' }).eq('id', id);
            if (result.error) {
                toast('Erro: ' + result.error.message, 'error');
            } else {
                toast('Agendamento confirmado!', 'success');
                closeAppointmentDetails();
                loadDashboard();
                loadAppointments(currentPage);
            }
        } catch (err) {
            console.error(err);
            toast('Erro ao confirmar agendamento.', 'error');
        }
    }

    async function cancelAppointmentFromDetails(id) {
        try {
            var result = await sb.from('appointments').select('*, barber:barbers(name)').eq('id', id).single();
            if (!result.data) {
                toast('Agendamento não encontrado.', 'error');
                return;
            }

            var cancelLink = getWhatsAppCancelLink(result.data);

            $('appointment-details-body').innerHTML += '<div id="cancel-warning-box" style="margin-top: 16px; padding: 12px; background: var(--danger-light); border-radius: 6px; border-left: 4px solid var(--danger);">' +
                '<div style="font-weight: 600; color: var(--danger); margin-bottom: 8px;">&#9888; Notifique o cliente no WhatsApp</div>' +
                '<div style="font-size: 0.85rem; color: var(--gray-600); margin-bottom: 12px;">Antes de confirmar o cancelamento, notifique o cliente clicando no link abaixo:</div>' +
                '<a href="' + cancelLink + '" class="appointment-detail-cancel-link" target="_blank"><i class="fab fa-whatsapp"></i> Notificar Cliente (WhatsApp)</a>' +
                '<div style="margin-top: 12px; font-size: 0.8rem; color: var(--gray-500);">Após notificar, clique em "Confirmar Cancelamento" abaixo.</div>' +
            '</div>';

            var footerHTML = '<button onclick="AdminApp.rescheduleAppointment(\'' + jsString(id) + '\')" class="btn-primary">Reagendar</button>' +
                '<button onclick="AdminApp.confirmCancel(\'' + jsString(id) + '\')" class="btn-primary btn-danger">Confirmar Cancelamento</button>' +
                '<button onclick="AdminApp.showAppointmentDetails(\'' + jsString(id) + '\')" class="btn-outline">Voltar</button>';
            $('appointment-details-footer').innerHTML = '<div class="appointment-detail-actions">' + footerHTML + '</div>';

            setTimeout(function() {
                var warningBox = $('cancel-warning-box');
                if (warningBox) warningBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 100);

        } catch (err) {
            console.error(err);
            toast('Erro ao preparar cancelamento.', 'error');
        }
    }

    async function rescheduleAppointment(id) {
        try {
            var result = await sb.from('appointments').select('*, barber:barbers(name)').eq('id', id).single();
            if (!result.data) {
                toast('Agendamento não encontrado.', 'error');
                return;
            }

            _rescheduleState.appointment = result.data;
            _rescheduleState.calendarDate = new Date();
            _rescheduleState.selectedDate = null;
            _rescheduleState.selectedTime = null;

            var schedResult = await sb.from('barber_schedules').select('*').eq('barber_id', result.data.barber_id);
            _rescheduleState.barberSchedule = {};
            (schedResult.data || []).forEach(function (s) {
                _rescheduleState.barberSchedule[s.day_of_week] = {
                    start: String(s.start_time).substring(0, 5),
                    end: String(s.end_time).substring(0, 5)
                };
            });

            try {
                var holResult = await sb.from('holidays').select('*');
                _rescheduleState.holidays = holResult.data || [];
            } catch (e) {
                _rescheduleState.holidays = [];
            }

            closeAppointmentDetails();
            renderRescheduleModal();
            $('reschedule-overlay').style.display = 'flex';
        } catch (err) {
            console.error(err);
            toast('Erro ao preparar reagendamento.', 'error');
        }
    }

    function renderRescheduleModal() {
        var a = _rescheduleState.appointment;
        var services = (a.service_names || []).join(', ');
        var barberName = a.barber ? a.barber.name : 'Barbeiro';

        var html = '<div class="reschedule-current-info">' +
            '<div class="reschedule-label">Agendamento atual</div>' +
            '<div class="reschedule-detail"><strong>' + escapeHTML(a.client_name) + '</strong> — ' + escapeHTML(barberName) + '</div>' +
            '<div class="reschedule-detail">' + escapeHTML(services) + '</div>' +
            '<div class="reschedule-detail">' + formatDate(a.appointment_date) + ' às ' + formatTime(a.appointment_time) + '</div>' +
        '</div>' +
        '<div class="reschedule-arrow"><i class="fas fa-arrow-down"></i> Escolha a nova data e horário</div>' +
        '<div class="reschedule-calendar">' +
            '<div class="reschedule-calendar-header">' +
                '<button type="button" id="reschedule-prev-month" class="btn-outline btn-sm"><i class="fas fa-chevron-left"></i></button>' +
                '<span id="reschedule-month-year"></span>' +
                '<button type="button" id="reschedule-next-month" class="btn-outline btn-sm"><i class="fas fa-chevron-right"></i></button>' +
            '</div>' +
            '<div class="reschedule-calendar-weekdays">' +
                '<span>Dom</span><span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sáb</span>' +
            '</div>' +
            '<div id="reschedule-calendar-days" class="reschedule-calendar-days"></div>' +
        '</div>' +
        '<div id="reschedule-time-section" class="reschedule-time-section" style="display:none">' +
            '<div class="reschedule-label">Horários disponíveis</div>' +
            '<div id="reschedule-time-slots" class="reschedule-time-slots"></div>' +
        '</div>';

        $('reschedule-body').innerHTML = html;
        $('reschedule-footer').innerHTML = '<button onclick="AdminApp.confirmReschedule()" class="btn-primary" id="btn-confirm-reschedule" disabled><i class="fas fa-calendar-check"></i> Confirmar Reagendamento</button>' +
            '<button onclick="AdminApp.closeReschedule()" class="btn-outline">Cancelar</button>';

        renderRescheduleCalendar();

        $('reschedule-prev-month').addEventListener('click', function () {
            _rescheduleState.calendarDate.setMonth(_rescheduleState.calendarDate.getMonth() - 1);
            renderRescheduleCalendar();
        });
        $('reschedule-next-month').addEventListener('click', function () {
            _rescheduleState.calendarDate.setMonth(_rescheduleState.calendarDate.getMonth() + 1);
            renderRescheduleCalendar();
        });
    }

    function renderRescheduleCalendar() {
        var year = _rescheduleState.calendarDate.getFullYear();
        var month = _rescheduleState.calendarDate.getMonth();
        var months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

        $('reschedule-month-year').textContent = months[month] + ' ' + year;

        var firstDay = new Date(year, month, 1).getDay();
        var daysInMonth = new Date(year, month + 1, 0).getDate();
        var today = new Date();
        today.setHours(0, 0, 0, 0);

        var html = '';
        for (var i = 0; i < firstDay; i++) {
            html += '<button class="reschedule-day empty" disabled></button>';
        }

        for (var d = 1; d <= daysInMonth; d++) {
            var date = new Date(year, month, d);
            date.setHours(0, 0, 0, 0);
            var dayOfWeek = date.getDay();
            var isPast = date < today;
            var isToday = date.getTime() === today.getTime();
            var dateStr = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
            var barberWorks = !!_rescheduleState.barberSchedule[dayOfWeek];
            var isHol = _rescheduleState.holidays.some(function (h) {
                if (h.recurring) {
                    var holDate = new Date(h.date + 'T00:00:00');
                    return holDate.getMonth() === month && holDate.getDate() === d;
                }
                return h.date === dateStr;
            });
            var disabled = isPast || !barberWorks || isHol;
            var selClass = _rescheduleState.selectedDate === dateStr ? ' selected' : '';
            var todayClass = isToday ? ' today' : '';

            html += '<button class="reschedule-day' + selClass + todayClass + (disabled ? ' disabled' : '') + '"' +
                (disabled ? ' disabled' : '') +
                ' data-date="' + dateStr + '">' + d + '</button>';
        }

        $('reschedule-calendar-days').innerHTML = html;

        qsa('.reschedule-day:not(.disabled):not(.empty)').forEach(function (btn) {
            btn.addEventListener('click', function () {
                qsa('.reschedule-day').forEach(function (b) { b.classList.remove('selected'); });
                btn.classList.add('selected');
                _rescheduleState.selectedDate = btn.getAttribute('data-date');
                _rescheduleState.selectedTime = null;
                $('btn-confirm-reschedule').disabled = true;
                renderRescheduleTimeSlots();
            });
        });
    }

    async function renderRescheduleTimeSlots() {
        if (!_rescheduleState.selectedDate) {
            $('reschedule-time-section').style.display = 'none';
            return;
        }

        $('reschedule-time-section').style.display = 'block';

        var dayOfWeek = new Date(_rescheduleState.selectedDate + 'T00:00:00').getDay();
        var daySchedule = _rescheduleState.barberSchedule[dayOfWeek];

        if (!daySchedule) {
            $('reschedule-time-slots').innerHTML = '<p class="empty-state">Este barbeiro não trabalha neste dia.</p>';
            return;
        }

        var SLOT_INTERVAL = 30;
        var startParts = daySchedule.start.split(':');
        var endParts = daySchedule.end.split(':');
        var startMin = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
        var endMin = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);
        var serviceDuration = _rescheduleState.appointment.total_duration || 60;
        var lastSlotMin = endMin - serviceDuration;

        var now = new Date();
        var today = new Date();
        today.setHours(0, 0, 0, 0);
        var isToday = _rescheduleState.selectedDate === todayStr();

        var bookedSlots = await getBookedSlotsForReschedule(_rescheduleState.appointment.barber_id, _rescheduleState.selectedDate);

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
                if (slotStart < bookedRanges[i].end && slotEnd > bookedRanges[i].start) return true;
            }
            return false;
        }

        var html = '';
        for (var m = startMin; m <= lastSlotMin; m += SLOT_INTERVAL) {
            var h = Math.floor(m / 60);
            var min = m % 60;
            var timeStr = String(h).padStart(2, '0') + ':' + String(min).padStart(2, '0');

            var disabled = false;
            if (isToday) {
                var currentMin = now.getHours() * 60 + now.getMinutes();
                if (m <= currentMin + 30) disabled = true;
            }

            if (isOverlap(m, serviceDuration)) disabled = true;

            var selClass = _rescheduleState.selectedTime === timeStr ? ' selected' : '';
            html += '<button class="reschedule-slot' + selClass + (disabled ? ' disabled' : '') + '"' +
                (disabled ? ' disabled' : '') +
                ' data-time="' + timeStr + '">' + timeStr + '</button>';
        }

        if (!html) html = '<p class="empty-state">Nenhum horário disponível nesta data.</p>';

        $('reschedule-time-slots').innerHTML = html;

        qsa('.reschedule-slot:not(.disabled)').forEach(function (slot) {
            slot.addEventListener('click', function () {
                qsa('.reschedule-slot').forEach(function (s) { s.classList.remove('selected'); });
                slot.classList.add('selected');
                _rescheduleState.selectedTime = slot.getAttribute('data-time');
                $('btn-confirm-reschedule').disabled = false;
            });
        });

        setTimeout(function () {
            var section = $('reschedule-time-section');
            if (section) section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
    }

    async function getBookedSlotsForReschedule(barberId, date) {
        try {
            var rpcResult = await sb.rpc('get_public_booked_slots', {
                p_barber_id: barberId,
                p_appointment_date: date
            });
            if (!rpcResult.error) return rpcResult.data || [];
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

    async function confirmReschedule() {
        if (!_rescheduleState.selectedDate || !_rescheduleState.selectedTime) {
            toast('Selecione a nova data e horário.', 'error');
            return;
        }

        var btn = $('btn-confirm-reschedule');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Reagendando...';

        try {
            var a = _rescheduleState.appointment;
            var oldDate = a.appointment_date;
            var oldTime = a.appointment_time;

            var result = await sb.from('appointments').update({
                appointment_date: _rescheduleState.selectedDate,
                appointment_time: _rescheduleState.selectedTime + ':00',
                status: 'confirmed'
            }).eq('id', a.id);

            if (result.error) {
                toast('Erro: ' + result.error.message, 'error');
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-calendar-check"></i> Confirmar Reagendamento';
                return;
            }

            var whatsappLink = getWhatsAppRescheduleLink(a);

            $('reschedule-body').innerHTML = '<div class="reschedule-success">' +
                '<div class="reschedule-success-icon"><i class="fas fa-check-circle"></i></div>' +
                '<h3 class="reschedule-success-title">Reagendado com sucesso!</h3>' +
                '<div class="reschedule-detail" style="text-align:center;">' +
                    '<strong>' + escapeHTML(a.client_name) + '</strong>' +
                '</div>' +
                '<div class="reschedule-change">' +
                    '<div class="reschedule-change-old"><span>Antes</span><strong>' + formatDate(oldDate) + '</strong><strong>' + formatTime(oldTime) + '</strong></div>' +
                    '<div class="reschedule-change-arrow"><i class="fas fa-arrow-right"></i></div>' +
                    '<div class="reschedule-change-new"><span>Agora</span><strong>' + formatDate(_rescheduleState.selectedDate) + '</strong><strong>' + _rescheduleState.selectedTime + '</strong></div>' +
                '</div>' +
                '<a href="' + whatsappLink + '" class="appointment-detail-whatsapp-link" target="_blank" style="justify-content:center;margin-top:16px;">' +
                    '<i class="fab fa-whatsapp"></i> Notificar Cliente (WhatsApp)' +
                '</a>' +
            '</div>';

            $('reschedule-footer').innerHTML = '<button onclick="AdminApp.closeReschedule()" class="btn-primary">Fechar</button>';

            toast('Agendamento reagendado!', 'success');
            loadDashboard();
            loadAppointments(currentPage);
        } catch (err) {
            console.error(err);
            toast('Erro ao reagendar.', 'error');
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-calendar-check"></i> Confirmar Reagendamento';
        }
    }

    function getWhatsAppRescheduleLink(appointment) {
        var clean = appointment.client_phone.replace(/\D/g, '');
        if (!clean.startsWith('55')) clean = '55' + clean;
        var oldDate = formatDate(appointment.appointment_date);
        var oldTime = formatTime(appointment.appointment_time);
        var newDate = formatDate(_rescheduleState.selectedDate);
        var newTime = _rescheduleState.selectedTime;
        var text = 'Olá, ' + appointment.client_name + '! 😊\n\n' +
            'Seu agendamento foi reagendado:\n' +
            '✂️ ' + (appointment.service_names || []).join(', ') + '\n' +
            '👤 ' + (appointment.barber ? appointment.barber.name : 'Barbeiro') + '\n\n' +
            '❌ Antes: ' + oldDate + ' às ' + oldTime + '\n' +
            '✅ Agora: ' + newDate + ' às ' + newTime + '\n\n' +
            'Agradecemos a compreensão! ✂️';
        return 'https://wa.me/' + clean + '?text=' + encodeURIComponent(text);
    }

    function closeReschedule() {
        $('reschedule-overlay').style.display = 'none';
        _rescheduleState = {
            appointment: null,
            calendarDate: new Date(),
            selectedDate: null,
            selectedTime: null,
            barberSchedule: {},
            holidays: []
        };
    }

    async function confirmCancel(id) {
        try {
            var result = await sb.from('appointments').update({ status: 'cancelled' }).eq('id', id);
            if (result.error) {
                toast('Erro ao cancelar: ' + result.error.message, 'error');
            } else {
                toast('Agendamento cancelado com sucesso!', 'success');
                closeAppointmentDetails();
                loadDashboard();
                loadAppointments(currentPage);
            }
        } catch (err) {
            console.error(err);
            toast('Erro ao cancelar agendamento.', 'error');
        }
    }

    async function deleteAppointment(id) {
        closeAppointmentDetails();
        showConfirm('Remover Agendamento', 'Tem certeza que deseja remover este agendamento do histórico? Esta ação não pode ser desfeita.', async function () {
            try {
                var result = await sb.from('appointments').delete().eq('id', id);
                if (result.error) {
                    toast('Erro ao remover: ' + result.error.message, 'error');
                } else {
                    toast('Agendamento removido do histórico.', 'success');
                    loadDashboard();
                    loadAppointments(currentPage);
                }
            } catch (err) {
                console.error(err);
                toast('Erro ao remover agendamento.', 'error');
            }
        });
    }

    // ========== BARBERS CRUD ==========

    var _barberSchedules = {};

    var _rescheduleState = {
        appointment: null,
        calendarDate: new Date(),
        selectedDate: null,
        selectedTime: null,
        barberSchedule: {},
        holidays: []
    };

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
            var holidayBadge = '';
            var photoHtml = b.photo_url
                ? '<div class="card-barber-photo"><img src="' + escapeHTML(b.photo_url) + '" alt="' + escapeHTML(b.name) + '"></div>'
                : '<div class="card-barber-photo card-barber-photo-placeholder"><i class="fas fa-user"></i></div>';
            return '<div class="manage-card ' + (b.active ? '' : 'inactive') + '">' +
                '<span class="card-badge ' + badgeClass + '">' + badgeText + '</span>' +
                holidayBadge +
                photoHtml +
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
                '<div class="time-inputs">' +
                    '<input type="time" class="schedule-time-start" data-day="' + day.num + '" value="' + st + '" ' + (hasDay ? '' : 'disabled') + '>' +
                    '<span class="schedule-sep">às</span>' +
                    '<input type="time" class="schedule-time-end" data-day="' + day.num + '" value="' + en + '" ' + (hasDay ? '' : 'disabled') + '>' +
                '</div>' +
            '</div>';
        });

        var html = '<div class="form-group"><label>Nome</label><input type="text" id="field-name" value="' + escapeHTML(name) + '" required></div>' +
            '<div class="form-group"><label><i class="fas fa-camera"></i> Foto do Perfil</label>' +
                '<div class="barber-photo-upload-area">' +
                    '<div class="barber-photo-preview" id="barber-photo-preview"><i class="fas fa-user-circle"></i></div>' +
                    '<input type="file" id="field-photo" accept="image/*" style="display:none">' +
                    '<input type="hidden" id="field-photo-remove" value="false">' +
                    '<div class="barber-photo-actions">' +
                        '<button type="button" class="btn-outline btn-sm" id="btn-choose-photo"><i class="fas fa-camera"></i> Escolher Foto</button>' +
                        '<button type="button" class="btn-outline btn-sm btn-danger" id="btn-remove-photo" style="display:none"><i class="fas fa-trash"></i> Remover</button>' +
                    '</div>' +
                    '<div class="barber-photo-hint">JPG ou PNG, maximo 2MB</div>' +
                '</div>' +
            '</div>' +
            '<div class="form-group"><label>Horarios por dia da semana</label><div class="schedule-grid">' + scheduleHTML + '</div></div>';

        showModal(title, html, async function () {
             var newName = $('field-name').value.trim();
             if (!newName) { toast('Nome e obrigatorio.', 'error'); return; }

             var barberData = {
                  name: newName
              };

             var photoFile = $('field-photo') && $('field-photo').files && $('field-photo').files[0] ? $('field-photo').files[0] : null;
             var shouldRemovePhoto = $('field-photo-remove') && $('field-photo-remove').value === 'true';

             if (shouldRemovePhoto) barberData.photo_url = null;

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
             var savedBarberId = isEdit ? barber.id : null;

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
                     savedBarberId = result.data[0].id;
                     var insertData = scheduleEntries.map(function (s) {
                         return { barber_id: savedBarberId, day_of_week: s.day_of_week, start_time: s.start_time, end_time: s.end_time };
                     });
                     await sb.from('barber_schedules').insert(insertData);
                 }
             }

             if (!result.error && photoFile && savedBarberId) {
                 var photoPath = savedBarberId + '/photo';
                 var uploadResult = await sb.storage.from('barber-photos').upload(photoPath, photoFile, { upsert: true });
                 if (!uploadResult.error) {
                     var urlData = sb.storage.from('barber-photos').getPublicUrl(photoPath);
                     await sb.from('barbers').update({ photo_url: urlData.data.publicUrl }).eq('id', savedBarberId);
                 } else {
                     console.warn('Photo upload failed:', uploadResult.error.message);
                 }
             }

             if (shouldRemovePhoto && isEdit && barber.photo_url) {
                 try {
                     var oldPath = barber.id + '/photo';
                     await sb.storage.from('barber-photos').remove([oldPath]);
                 } catch (e) {}
             }

             if (result.error) {
                 toast('Erro: ' + result.error.message, 'error');
             } else {
                 hideModal();
                 toast(isEdit ? 'Barbeiro atualizado!' : 'Barbeiro adicionado!', 'success');
                 loadBarbers();
                 loadDashboard();
             }
         }, function () {
              function toggleDayInputs() {
                  qsa('.day-check').forEach(function (cb) {
                      var day = cb.getAttribute('data-day');
                      var startInput = document.querySelector('.schedule-time-start[data-day="' + day + '"]');
                      var endInput = document.querySelector('.schedule-time-end[data-day="' + day + '"]');
                      startInput.disabled = !cb.checked;
                      endInput.disabled = !cb.checked;
                  });
              }
              toggleDayInputs();
              qsa('.day-check').forEach(function (cb) {
                  cb.addEventListener('change', toggleDayInputs);
              });

              var photoPreview = $('barber-photo-preview');
              var photoInput = $('field-photo');
              var btnChoosePhoto = $('btn-choose-photo');
              var btnRemovePhoto = $('btn-remove-photo');

              if (isEdit && barber && barber.photo_url) {
                  photoPreview.innerHTML = '<img src="' + escapeHTML(barber.photo_url) + '" alt="Foto">';
                  btnRemovePhoto.style.display = 'inline-flex';
              }

              btnChoosePhoto.addEventListener('click', function () { photoInput.click(); });

              photoInput.addEventListener('change', function () {
                  var file = this.files[0];
                  if (!file) return;
                  if (file.size > 2 * 1024 * 1024) {
                      toast('Foto muito grande. Use imagens ate 2MB.', 'error');
                      this.value = '';
                      return;
                  }
                  var reader = new FileReader();
                  reader.onload = function (e) {
                      photoPreview.innerHTML = '<img src="' + e.target.result + '" alt="Preview">';
                  };
                  reader.readAsDataURL(file);
                  btnRemovePhoto.style.display = 'inline-flex';
                  $('field-photo-remove').value = 'false';
              });

              btnRemovePhoto.addEventListener('click', function () {
                  photoPreview.innerHTML = '<i class="fas fa-user-circle"></i>';
                  photoInput.value = '';
                  if (isEdit && barber && barber.photo_url) {
                      $('field-photo-remove').value = 'true';
                  }
                  btnRemovePhoto.style.display = 'none';
              });
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

            var badges = '<span class="card-badge ' + badgeClass + '">' + badgeText + '</span>';
            if (s.featured) badges += ' <span class="badge-featured">&#11088; MAIS PEDIDO</span>';
            return '<div class="manage-card ' + (s.active ? '' : 'inactive') + '">' +
                '<h4>' + escapeHTML(s.name) + '</h4>' +
                '<div class="card-meta-line">' +
                    '<span class="card-price">' + formatCurrency(s.price) + '</span>' +
                    '<span class="card-detail">&#9202; ' + duration + '</span>' +
                    badges +
                '</div>' +
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

    // ========== PRODUCTS CRUD (produtos da lojinha) ==========

    async function loadProducts() {
        try {
            var result = await sb.from('products').select('*').order('sort_order').order('name');
            renderProducts(result.data || []);
        } catch (err) {
            $('products-list').innerHTML = '<p class="empty-state">Erro ao carregar produtos.</p>';
        }
    }

    function renderProducts(products) {
        var container = $('products-list');
        if (!products.length) {
            container.innerHTML = '<p class="empty-state">Nenhum produto cadastrado.</p>';
            return;
        }
        container.innerHTML = products.map(function (p) {
            var badgeClass = p.active ? 'badge-active' : 'badge-inactive';
            var badgeText = p.active ? 'Ativo' : 'Inativo';
            var photoHtml = p.photo_url
                ? '<div class="card-barber-photo"><img src="' + escapeHTML(p.photo_url) + '" alt="' + escapeHTML(p.name) + '"></div>'
                : '<div class="card-barber-photo card-barber-photo-placeholder"><i class="fas fa-box"></i></div>';
            return '<div class="manage-card ' + (p.active ? '' : 'inactive') + '">' +
                '<span class="card-badge ' + badgeClass + '">' + badgeText + '</span>' +
                photoHtml +
                '<h4>' + escapeHTML(p.name) + '</h4>' +
                (p.description ? '<div class="card-detail" style="font-size:0.8rem">' + escapeHTML(p.description) + '</div>' : '') +
                '<div class="card-meta-line">' +
                    '<span class="card-price">' + formatCurrency(p.price) + '</span>' +
                '</div>' +
                '<div class="card-stock ' + (p.stock === 0 ? 'stock-empty' : p.stock <= 5 ? 'stock-low' : 'stock-ok') + '">' + (p.stock === 0 ? '<i class="fas fa-exclamation-circle"></i> Esgotado' : '<i class="fas fa-cubes"></i> Estoque: ' + p.stock + ' un.') + '</div>' +
                '<div class="card-actions">' +
                    '<button class="btn-outline btn-sm" onclick="AdminApp.editProduct(\'' + jsString(p.id) + '\')">Editar</button>' +
                    '<button class="btn-outline btn-sm" onclick="AdminApp.toggleProduct(\'' + jsString(p.id) + '\', ' + !p.active + ')">' + (p.active ? 'Desativar' : 'Ativar') + '</button>' +
                    '<button class="btn-outline btn-sm btn-danger" onclick="AdminApp.deleteProduct(\'' + jsString(p.id) + '\')">Excluir</button>' +
                '</div>' +
            '</div>';
        }).join('');
    }

    function showProductForm(product) {
        var isEdit = !!product;
        var title = isEdit ? 'Editar Produto' : 'Novo Produto';
        var name = isEdit ? product.name : '';
        var desc = isEdit ? (product.description || '') : '';
        var price = isEdit ? product.price : '';

        var html = '<div class="form-group"><label>Nome</label><input type="text" id="field-name" value="' + escapeHTML(name) + '" required></div>' +
            '<div class="form-group"><label>Descrição</label><textarea id="field-desc" rows="2" placeholder="Descrição do produto (opcional)">' + escapeHTML(desc) + '</textarea></div>' +
            '<div class="form-group"><label>Preço (R$)</label><input type="number" id="field-price" value="' + price + '" step="0.01" min="0" required></div>' +
            '<div class="form-group"><label><i class="fas fa-cubes"></i> Estoque</label><input type="number" id="field-stock" value="' + (isEdit ? (product.stock || 0) : 0) + '" min="0" step="1" required><div class="barber-photo-hint">Quantidade disponível (0 = esgotado)</div></div>' +
            '<div class="form-group"><label><i class="fas fa-camera"></i> Foto do Produto</label>' +
                '<div class="barber-photo-upload-area">' +
                    '<div class="barber-photo-preview" id="product-photo-preview"><i class="fas fa-box"></i></div>' +
                    '<input type="file" id="field-product-photo" accept="image/*" style="display:none">' +
                    '<input type="hidden" id="field-photo-remove" value="false">' +
                    '<div class="barber-photo-actions">' +
                        '<button type="button" class="btn-outline btn-sm" id="btn-choose-product-photo"><i class="fas fa-camera"></i> Escolher Foto</button>' +
                        '<button type="button" class="btn-outline btn-sm btn-danger" id="btn-remove-product-photo" style="display:none"><i class="fas fa-trash"></i> Remover</button>' +
                    '</div>' +
                    '<div class="barber-photo-hint">JPG ou PNG, maximo 2MB</div>' +
                '</div>' +
            '</div>';

        showModal(title, html, async function () {
            var newName = $('field-name').value.trim();
            var newDesc = $('field-desc').value.trim();
            var newPrice = parseFloat($('field-price').value);

            if (!newName || isNaN(newPrice)) {
                toast('Preencha nome e preço.', 'error');
                return;
            }

            var data = { name: newName, description: newDesc || null, price: newPrice, stock: parseInt($('field-stock').value) || 0 };

            var photoFile = $('field-product-photo') && $('field-product-photo').files && $('field-product-photo').files[0] ? $('field-product-photo').files[0] : null;
            var shouldRemovePhoto = $('field-photo-remove') && $('field-photo-remove').value === 'true';

            if (shouldRemovePhoto) data.photo_url = null;

            var result;
            var savedId = isEdit ? product.id : null;

            if (isEdit) {
                result = await sb.from('products').update(data).eq('id', product.id);
            } else {
                var maxResult = await sb.from('products').select('sort_order').order('sort_order', { ascending: false }).limit(1);
                data.sort_order = (maxResult.data && maxResult.data.length) ? (maxResult.data[0].sort_order + 1) : 1;
                data.active = true;
                result = await sb.from('products').insert(data).select();
                if (!result.error && result.data && result.data.length) {
                    savedId = result.data[0].id;
                }
            }

            if (!result.error && photoFile && savedId) {
                var photoPath = savedId + '/photo';
                var uploadResult = await sb.storage.from('product-photos').upload(photoPath, photoFile, { upsert: true });
                if (!uploadResult.error) {
                    var urlData = sb.storage.from('product-photos').getPublicUrl(photoPath);
                    await sb.from('products').update({ photo_url: urlData.data.publicUrl }).eq('id', savedId);
                }
            }

            if (shouldRemovePhoto && isEdit && product.photo_url) {
                try {
                    await sb.storage.from('product-photos').remove([product.id + '/photo']);
                } catch (e) {}
            }

            if (result.error) {
                toast('Erro: ' + result.error.message, 'error');
            } else {
                hideModal();
                toast(isEdit ? 'Produto atualizado!' : 'Produto adicionado!', 'success');
                loadProducts();
            }
        }, function () {
            var photoPreview = $('product-photo-preview');
            var photoInput = $('field-product-photo');
            var btnChoose = $('btn-choose-product-photo');
            var btnRemove = $('btn-remove-product-photo');

            if (isEdit && product && product.photo_url) {
                photoPreview.innerHTML = '<img src="' + escapeHTML(product.photo_url) + '" alt="Foto">';
                btnRemove.style.display = 'inline-flex';
            }

            btnChoose.addEventListener('click', function () { photoInput.click(); });

            photoInput.addEventListener('change', function () {
                var file = this.files[0];
                if (!file) return;
                if (file.size > 2 * 1024 * 1024) {
                    toast('Foto muito grande. Use imagens ate 2MB.', 'error');
                    this.value = '';
                    return;
                }
                var reader = new FileReader();
                reader.onload = function (e) {
                    photoPreview.innerHTML = '<img src="' + e.target.result + '" alt="Preview">';
                };
                reader.readAsDataURL(file);
                btnRemove.style.display = 'inline-flex';
                $('field-photo-remove').value = 'false';
            });

            btnRemove.addEventListener('click', function () {
                photoPreview.innerHTML = '<i class="fas fa-box"></i>';
                photoInput.value = '';
                if (isEdit && product && product.photo_url) {
                    $('field-photo-remove').value = 'true';
                }
                btnRemove.style.display = 'none';
            });
        });
    }

    async function editProduct(id) {
        var result = await sb.from('products').select('*').eq('id', id).single();
        if (result.data) showProductForm(result.data);
    }

    async function toggleProduct(id, active) {
        var result = await sb.from('products').update({ active: active }).eq('id', id);
        if (result.error) {
            toast('Erro: ' + result.error.message, 'error');
        } else {
            toast(active ? 'Produto ativado!' : 'Produto desativado.', 'success');
            loadProducts();
        }
    }

    function deleteProduct(id) {
        showConfirm('Excluir Produto', 'Tem certeza que deseja excluir este produto?', async function () {
            var result = await sb.from('products').delete().eq('id', id);
            if (result.error) {
                toast('Erro: ' + result.error.message, 'error');
            } else {
                toast('Produto excluído.', 'success');
                loadProducts();
            }
        });
    }

    // ========== PRODUCT ORDERS (pedidos/reservas de produtos) ==========

    async function loadProductOrders() {
        try {
            var query = sb.from('product_orders').select('*').order('created_at', { ascending: false });
            var filterStatus = $('filter-order-status').value;
            if (filterStatus) query = query.eq('status', filterStatus);
            var result = await query;
            renderProductOrders(result.data || []);
        } catch (err) {
            $('product-orders-list').innerHTML = '<p class="empty-state">Erro ao carregar pedidos.</p>';
        }
    }

    function renderProductOrders(orders) {
        var container = $('product-orders-list');
        if (!orders.length) {
            container.innerHTML = '<p class="empty-state">Nenhum pedido encontrado.</p>';
            return;
        }
        container.innerHTML = orders.map(function (o) {
            var statusClass = 'status-' + o.status;
            var statusLabel = { reserved: 'Reservado', picked_up: 'Retirado', cancelled: 'Cancelado' }[o.status] || o.status;
            var items = '';
            for (var i = 0; i < (o.product_names || []).length; i++) {
                items += escapeHTML(o.product_names[i]) + ' x' + (o.quantities[i] || 1);
                if (i < o.product_names.length - 1) items += ', ';
            }
            var date = new Date(o.created_at);
            var dateStr = date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            var phone = formatPhone(o.client_phone);

            var actionsHtml = '';
            if (o.status === 'reserved') {
                actionsHtml += '<button class="btn-outline btn-sm" onclick="AdminApp.markOrderPickedUp(\'' + jsString(o.id) + '\')"><i class="fas fa-check"></i> Retirado</button>';
                actionsHtml += '<button class="btn-outline btn-sm btn-danger" onclick="AdminApp.cancelOrder(\'' + jsString(o.id) + '\')"><i class="fas fa-ban"></i> Cancelar</button>';
            }
            actionsHtml += '<button class="btn-outline btn-sm btn-danger" onclick="AdminApp.deleteOrder(\'' + jsString(o.id) + '\')" title="Excluir pedido"><i class="fas fa-trash-alt"></i></button>';
            if (o.status === 'reserved' || o.status === 'picked_up') {
                var cleanPhone = o.client_phone.replace(/\D/g, '');
                if (!cleanPhone.startsWith('55')) cleanPhone = '55' + cleanPhone;
                var waText = 'Olá, ' + escapeHTML(o.client_name) + '! Sou da Pereira\'s Barber Shop sobre seu pedido: ' + items + ' - Total: ' + formatCurrency(o.total_price);
                actionsHtml += '<a href="https://wa.me/' + cleanPhone + '?text=' + encodeURIComponent(waText) + '" class="btn-outline btn-sm" target="_blank" style="text-decoration:none;display:inline-flex;align-items:center;gap:4px"><i class="fab fa-whatsapp"></i></a>';
            }

            return '<div class="appointment-card" style="cursor:default">' +
                '<div class="appointment-info">' +
                    '<div class="appointment-details">' +
                        '<div class="appointment-client">' + escapeHTML(o.client_name) + ' <span style="font-weight:400;font-size:0.8rem;color:var(--gray-500)">' + phone + '</span></div>' +
                        '<div class="appointment-meta">' +
                            '<span>' + escapeHTML(items) + '</span>' +
                        '</div>' +
                        '<div class="appointment-meta" style="margin-top:4px">' +
                            '<span style="font-weight:700;color:var(--green-dark)">' + formatCurrency(o.total_price) + '</span>' +
                            '<span style="font-size:0.8rem;color:var(--gray-400)">' + dateStr + '</span>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="appointment-actions">' +
                    '<span class="status-badge ' + statusClass + '">' + escapeHTML(statusLabel) + '</span>' +
                    actionsHtml +
                '</div>' +
            '</div>';
        }).join('');
    }

    async function markOrderPickedUp(id) {
        var result = await sb.from('product_orders').update({ status: 'picked_up' }).eq('id', id);
        if (result.error) {
            toast('Erro: ' + result.error.message, 'error');
        } else {
            toast('Pedido marcado como retirado!', 'success');
            loadProductOrders();
        }
    }

    async function cancelOrder(id) {
        showConfirm('Cancelar Pedido', 'Tem certeza que deseja cancelar este pedido?', async function () {
            var result = await sb.from('product_orders').update({ status: 'cancelled' }).eq('id', id);
            if (result.error) {
                toast('Erro: ' + result.error.message, 'error');
            } else {
                toast('Pedido cancelado.', 'success');
                loadProductOrders();
            }
        });
    }

    function deleteOrder(id) {
        showConfirm('Excluir Pedido', 'Tem certeza que deseja excluir este pedido permanentemente? Esta ação não pode ser desfeita.', async function () {
            var result = await sb.from('product_orders').delete().eq('id', id);
            if (result.error) {
                toast('Erro: ' + result.error.message, 'error');
            } else {
                toast('Pedido excluído.', 'success');
                loadProductOrders();
            }
        });
    }

    // ========== ADMINS ==========

    async function loadAdmins() {
        try {
            var result = await sb.from('admins').select('*').order('created_at', { ascending: true });
            var admins = result.data || [];
            var container = $('admins-list');

            var session = await sb.auth.getSession();
            var currentUserId = session.data.session ? session.data.session.user.id : '';

            if (!admins.length) {
                container.innerHTML = '<p class="empty-state">Nenhum administrador encontrado.</p>';
                return;
            }

            var html = '';
            admins.forEach(function (a) {
                var isMe = a.user_id === currentUserId;
                html += '<div class="admin-card">' +
                    '<div class="admin-card-info">' +
                        '<div class="admin-avatar">' + escapeHTML(a.email.charAt(0).toUpperCase()) + '</div>' +
                        '<div>' +
                            '<div class="admin-name">' + escapeHTML(a.email) + (isMe ? ' <span style="font-size:0.75rem;color:var(--gold-dim);">(você)</span>' : '') + '</div>' +
                            '<div class="admin-role">Admin autorizado</div>' +
                        '</div>' +
                    '</div>' +
                    '<div class="admin-card-actions">' +
                        '<span class="status-badge status-confirmed">Ativo</span>' +
                        (isMe ? '' : '<button class="btn-icon success" onclick="AdminApp.resetAdminPassword(\'' + jsString(a.email) + '\')" title="Resetar senha"><i class="fas fa-key"></i></button>' +
                        '<button class="btn-icon danger" onclick="AdminApp.removeAdmin(\'' + a.user_id + '\', \'' + jsString(a.email) + '\')" title="Remover"><i class="fas fa-trash-alt"></i></button>') +
                    '</div>' +
                '</div>';
            });

            container.innerHTML = html;
        } catch (err) {
            $('admins-list').innerHTML = '<p class="empty-state">Erro ao carregar administradores.</p>';
        }
    }

    function showAddAdminForm() {
        var html =
            '<div class="form-group">' +
                '<label><i class="fas fa-envelope"></i> Email</label>' +
                '<input type="email" id="admin-new-email" placeholder="email@exemplo.com" style="font-size:16px" required>' +
            '</div>' +
            '<div class="form-group">' +
                '<label><i class="fas fa-lock"></i> Senha</label>' +
                '<input type="password" id="admin-new-password" placeholder="Mínimo 6 caracteres" style="font-size:16px" required>' +
            '</div>' +
            '<p style="font-size:0.8rem;color:var(--gray-600);margin-top:8px;">O novo admin receberá um email de confirmação (se ativado no Supabase). Após confirmar, poderá fazer login.</p>';

        showModal('Novo Administrador', html, function () {
            addNewAdmin();
        }, function () {
            var emailInput = $('admin-new-email');
            var passInput = $('admin-new-password');
            if (emailInput) emailInput.focus();
        });
    }

    async function addNewAdmin() {
        var email = $('admin-new-email').value.trim();
        var password = $('admin-new-password').value;

        if (!email || !password) {
            toast('Preencha email e senha.', 'error');
            return;
        }
        if (password.length < 6) {
            toast('A senha deve ter pelo menos 6 caracteres.', 'error');
            return;
        }

        try {
            var signUpResult = await sb.auth.signUp({
                email: email,
                password: password
            });

            if (signUpResult.error) {
                if (signUpResult.error.message.indexOf('already registered') >= 0 || signUpResult.error.message.indexOf('already been registered') >= 0) {
                    toast('Este email já está cadastrado. Adicione manualmente na tabela admins se for um usuário existente.', 'error');
                } else {
                    toast('Erro ao criar usuário: ' + signUpResult.error.message, 'error');
                }
                return;
            }

            var userId = signUpResult.data.user ? signUpResult.data.user.id : null;

            if (!userId) {
                toast('Usuário criado mas não foi possível obter o ID. Verifique o Supabase Auth e adicione manualmente na tabela admins.', 'error');
                hideModal();
                return;
            }

            var insertResult = await sb.from('admins').insert({
                user_id: userId,
                email: email,
                active: true
            });

            if (insertResult.error) {
                toast('Usuário criado no Auth mas erro ao adicionar na tabela admins: ' + insertResult.error.message, 'error');
                hideModal();
                return;
            }

            toast('Admin ' + email + ' criado com sucesso!', 'success');
            hideModal();
            loadAdmins();
        } catch (err) {
            toast('Erro: ' + (err.message || 'Tente novamente.'), 'error');
        }
    }

    function removeAdmin(userId, email) {
        showConfirm('Remover Administrador', 'Tem certeza que deseja remover ' + email + '? O usuário continuará existindo no Supabase Auth mas perderá acesso ao painel.', async function () {
            try {
                var result = await sb.from('admins').delete().eq('user_id', userId);
                if (result.error) {
                    toast('Erro ao remover: ' + result.error.message, 'error');
                    return;
                }
                toast('Admin ' + email + ' removido.', 'success');
                loadAdmins();
            } catch (err) {
                toast('Erro ao remover admin.', 'error');
            }
        });
    }

    function resetAdminPassword(email) {
        showConfirm('Resetar Senha', 'Enviar email de redefinição de senha para ' + email + '?', async function () {
            try {
                var result = await sb.auth.resetPasswordForEmail(email, {
                    redirectTo: window.location.origin + '/admin.html'
                });
                if (result.error) {
                    toast('Erro: ' + result.error.message, 'error');
                    return;
                }
                toast('Email de redefinição enviado para ' + email, 'success');
            } catch (err) {
                toast('Erro ao enviar email de redefinição.', 'error');
            }
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

        $('appointment-details-close').addEventListener('click', closeAppointmentDetails);
        $('appointment-details-overlay').addEventListener('click', function (e) {
            if (e.target === this) closeAppointmentDetails();
        });

        $('reschedule-close').addEventListener('click', closeReschedule);
        $('reschedule-overlay').addEventListener('click', function (e) {
            if (e.target === this) closeReschedule();
        });

        $('btn-add-barber').addEventListener('click', function () { showBarberForm(null); });
        $('btn-add-service').addEventListener('click', function () { showServiceForm(null); });
        $('btn-add-product').addEventListener('click', function () { showProductForm(null); });
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

        $('filter-order-status').addEventListener('change', function () { loadProductOrders(); });
        $('btn-clear-order-filters').addEventListener('click', function () {
            $('filter-order-status').value = '';
            loadProductOrders();
        });

        checkSession();
    }

    window.AdminApp = {
        showAppointmentDetails: showAppointmentDetails,
        closeAppointmentDetails: closeAppointmentDetails,
        confirmAppointment: confirmAppointment,
        cancelAppointmentFromDetails: cancelAppointmentFromDetails,
        rescheduleAppointment: rescheduleAppointment,
        confirmReschedule: confirmReschedule,
        closeReschedule: closeReschedule,
        confirmCancel: confirmCancel,
        deleteAppointment: deleteAppointment,
        completeAppointment: completeAppointment,
        openWhatsApp: openWhatsApp,
        editBarber: editBarber,
        toggleBarber: toggleBarber,
        deleteBarber: deleteBarber,
        editService: editService,
        toggleService: toggleService,
        deleteService: deleteService,
        editProduct: editProduct,
        toggleProduct: toggleProduct,
        deleteProduct: deleteProduct,
        markOrderPickedUp: markOrderPickedUp,
        cancelOrder: cancelOrder,
        deleteOrder: deleteOrder,
        goToPage: function (p) { loadAppointments(p); }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
