/**
 * admin.js — Painel Administrativo da Pereira's Barber Shop
 *
 * Arquivo principal de lógica do painel administrativo. Gerencia:
 *   - Autenticação via Supabase Auth (login/logout com signInWithPassword)
 *   - Dashboard com resumo do dia e da semana
 *   - CRUD completo de barbeiros (com horários por dia e upload de foto)
 *   - CRUD completo de serviços (nome, preço, duração, destaque)
 *   - CRUD completo de produtos da lojinha (com foto e controle de estoque)
 *   - Gerenciamento de pedidos/reservas de produtos
 *   - Gerenciamento de usuários administradores e barbeiros (roles)
 *   - Agendamentos: listagem, filtros, confirmação, cancelamento, reagendamento
 *   - Notificações em tempo real (polling + Supabase Realtime, Telegram, browser push)
 *   - Integração WhatsApp para comunicação com clientes
 *
 * Dependências externas:
 *   - supabase-config.js (define SUPABASE_URL, SUPABASE_ANON_KEY, TELEGRAM_BOT_TOKEN)
 *   - Supabase JS Client (carregado via CDN no admin.html)
 *
 * Estrutura: Toda a lógica é encapsulada em uma IIFE (Immediately Invoked Function
 * Expression) para evitar poluição do escopo global. Apenas o objeto `AdminApp`
 * é exposto em `window` para callbacks inline nos templates HTML gerados.
 */
(function () {
    'use strict';

    // ── Supabase Client ──────────────────────────────────────────────────────
    // Inicializa o client Supabase com as credenciais definidas em supabase-config.js.
    // A variável `sb` é usada em todas as operações de banco (queries, auth, storage).
    var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // ── Paginação ────────────────────────────────────────────────────────────
    // Número máximo de agendamentos exibidos por página na listagem.
    var ITEMS_PER_PAGE = 15;
    // Página atual da listagem de agendamentos (alterada pela navegação de paginação).
    var currentPage = 1;

    // ── Controle de Acesso (RBAC) ────────────────────────────────────────────
    // O sistema suporta dois papéis:
    //   - 'admin': acesso total a todas as abas (barbeiros, serviços, produtos, etc.)
    //   - 'barber': acesso restrito apenas ao dashboard e aos próprios agendamentos.
    // Essas variáveis são preenchidas após o login em verifyAdminAccess().
    var currentUserRole = 'admin';       // Papel do usuário logado ('admin' ou 'barber')
    var currentUserBarberId = null;       // ID do barbeiro vinculado (se role === 'barber')
    var currentUserBarberName = null;     // Nome do barbeiro vinculado (para exibição)

    // ── DOM Helpers ──────────────────────────────────────────────────────────
    // Atalhos para seleção de elementos DOM, usados extensivamente por todo o arquivo.
    function $(id) { return document.getElementById(id); }        // Seleciona por ID
    function qs(sel) { return document.querySelector(sel); }      // Seleciona o primeiro match
    function qsa(sel) { return document.querySelectorAll(sel); }  // Seleciona todos os matches

    // ── Funções Utilitárias ──────────────────────────────────────────────────

    /**
     * Escapa caracteres HTML especiais para prevenir XSS ao injetar dados do
     * banco em innerHTML. Converte &, <, >, ", ' para suas entidades HTML.
     * @param {*} value - Qualquer valor (será convertido para string).
     * @returns {string} String com caracteres perigosos escapados.
     */
    function escapeHTML(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
            return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
        });
    }

    /**
     * Escapa strings para uso seguro dentro de aspas simples em JavaScript inline
     * (ex: onclick="AdminApp.editBarber('...')"). Escapa barras invertidas,
     * aspas simples e remove quebras de linha.
     * @param {*} value - Valor a ser escapado.
     * @returns {string} String segura para embed em atributos JS inline.
     */
    function jsString(value) {
        return String(value == null ? '' : value)
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "\\'")
            .replace(/\r?\n/g, ' ');
    }

    /**
     * Formata uma data (string ISO "YYYY-MM-DD") para exibição amigável em pt-BR,
     * incluindo o dia da semana abreviado. Ex: "Seg, 12/05/2026".
     * O sufixo "T00:00:00" garante que a data seja interpretada no fuso local,
     * evitando problemas de timezone com datas puras.
     * @param {string} dateStr - Data no formato "YYYY-MM-DD".
     * @returns {string} Data formatada com dia da semana.
     */
    function formatDate(dateStr) {
        var d = new Date(dateStr + 'T00:00:00');
        var days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
        return days[d.getDay()] + ', ' + d.toLocaleDateString('pt-BR');
    }

    /**
     * Formata número de telefone para o padrão brasileiro: (XX) XXXXX-XXXX.
     * Remove todos os não-dígitos antes de aplicar a máscara.
     * @param {string} phone - Telefone com ou sem formatação.
     * @returns {string} Telefone formatado.
     */
    function formatPhone(phone) {
        return phone.replace(/\D/g, '').replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
    }

    /**
     * Formata um valor numérico como moeda brasileira (R$ XX,XX).
     * @param {number} value - Valor numérico.
     * @returns {string} Valor formatado, ex: "R$ 43,00".
     */
    function formatCurrency(value) {
        return 'R$ ' + Number(value).toFixed(2).replace('.', ',');
    }

    /**
     * Extrai apenas HH:MM de uma string de horário (pode vir como "HH:MM:SS").
     * @param {string} timeStr - Horário, possivelmente com segundos.
     * @returns {string} Horário no formato "HH:MM".
     */
    function formatTime(timeStr) {
        return timeStr.substring(0, 5);
    }

    /**
     * Mapa de números de dia da semana (0=Dom, 6=Sáb) para nomes abreviados.
     * Usado na exibição de horários de trabalho dos barbeiros.
     */
    var DAY_NAMES = {
        0: 'Dom', 1: 'Seg', 2: 'Ter', 3: 'Qua', 4: 'Qui', 5: 'Sex', 6: 'Sáb'
    };

    // ── UI Helpers (Toast, Modal, Confirm) ───────────────────────────────────

    /**
     * Exibe uma notificação temporária (toast) na tela por 3 segundos.
     * Usada para feedback visual de operações (sucesso/erro).
     * @param {string} msg - Mensagem a exibir.
     * @param {string} [type] - Tipo CSS: 'success', 'error', ou vazio.
     */
    function toast(msg, type) {
        var el = document.createElement('div');
        el.className = 'toast ' + (type || '');
        el.textContent = msg;
        $('toast-container').appendChild(el);
        setTimeout(function () { el.remove(); }, 3000);
    }

    /**
     * Abre o modal genérico de formulário (usado para criar/editar barbeiros,
     * serviços, produtos e administradores).
     * @param {string} title - Título do modal.
     * @param {string} bodyHTML - Conteúdo HTML do corpo do modal (formulário).
     * @param {Function} [onSave] - Callback executado ao clicar em "Salvar".
     * @param {Function} [onOpen] - Callback executado após o modal ser aberto
     *   (útil para inicializar listeners de inputs, previews de foto, etc.).
     */
    function showModal(title, bodyHTML, onSave, onOpen) {
        $('modal-title').textContent = title;
        $('modal-body').innerHTML = bodyHTML;
        $('modal-overlay').style.display = 'flex';
        $('modal-save').onclick = function () {
            if (onSave) onSave();
        };
        if (onOpen) onOpen();
    }

    /** Fecha o modal genérico de formulário. */
    function hideModal() {
        $('modal-overlay').style.display = 'none';
    }

    /**
     * Exibe um diálogo de confirmação (ex: "Tem certeza que deseja excluir?").
     * @param {string} title - Título do diálogo.
     * @param {string} msg - Mensagem descritiva da ação.
     * @param {Function} [onConfirm] - Callback executado ao confirmar.
     */
    function showConfirm(title, msg, onConfirm) {
        $('confirm-title').textContent = title;
        $('confirm-body').textContent = msg;
        $('confirm-overlay').style.display = 'flex';
        $('confirm-ok').onclick = function () {
            $('confirm-overlay').style.display = 'none';
            if (onConfirm) onConfirm();
        };
    }

    /** Fecha o diálogo de confirmação sem executar a ação. */
    function hideConfirm() {
        $('confirm-overlay').style.display = 'none';
    }

    // ── Funções de Data ──────────────────────────────────────────────────────

    /**
     * Retorna a data de hoje no formato "YYYY-MM-DD" (fuso local do navegador).
     * Usada extensivamente para queries de agendamentos do dia.
     * @returns {string} Data atual no formato ISO.
     */
    function todayStr() {
        var d = new Date();
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    /**
     * Calcula o intervalo da semana atual (segunda a domingo) no formato ISO.
     * Usada para estatísticas semanais no dashboard.
     * @returns {{ start: string, end: string }} Datas de segunda e domingo ("YYYY-MM-DD").
     */
    function getWeekRange() {
        var now = new Date();
        var day = now.getDay();
        var monday = new Date(now);
        monday.setDate(now.getDate() - ((day + 6) % 7));  // Recua até a segunda-feira
        var sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);  // Avança até o domingo
        return {
            start: monday.getFullYear() + '-' + String(monday.getMonth() + 1).padStart(2, '0') + '-' + String(monday.getDate()).padStart(2, '0'),
            end: sunday.getFullYear() + '-' + String(sunday.getMonth() + 1).padStart(2, '0') + '-' + String(sunday.getDate()).padStart(2, '0')
        };
    }

    // ══════════════════════════════════════════════════════════════════════════
    // ═─ AUTENTICAÇÃO (Supabase Auth) ══════════════════════════════════════════
    // ══════════════════════════════════════════════════════════════════════════
    //
    // Fluxo de autenticação:
    //   1. Usuário preenche email + senha no formulário de login
    //   2. handleLogin() chama sb.auth.signInWithPassword() (Supabase Auth)
    //   3. verifyAdminAccess() verifica se o usuário está na tabela 'admins'
    //      e carrega seu papel (role) e barber_id
    //   4. Se autorizado, showAdminPanel() inicializa o painel
    //   5. checkSession() é chamado ao carregar a página para restaurar sessão
    //
    // O sistema suporta dois papéis:
    //   - 'admin': acesso total ao painel
    //   - 'barber': acesso restrito ao dashboard e próprios agendamentos
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Manipula o submit do formulário de login.
     * Autentica via Supabase Auth (signInWithPassword) e verifica permissão
     * de admin antes de exibir o painel.
     * @param {Event} e - Evento de submit do formulário.
     */
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

    /**
     * Realiza logout do painel administrativo.
     * Limpa todas as inscrições em tempo real (Realtime + polling), zera caches
     * de notificação e faz signOut no Supabase Auth.
     */
    async function handleLogout() {
        if (_realtimeSubscription) {
            try { sb.removeAllChannels(); } catch (e) {}
            _realtimeSubscription = null;
        }
        if (_pollingInterval) {
            clearInterval(_pollingInterval);
            _pollingInterval = null;
        }
        _knownAppointmentIds = {};
        _seenAppointmentIds = {};
        _lastPolledCount = -1;
        await sb.auth.signOut();
        $('admin-panel').style.display = 'none';
        $('login-screen').style.display = 'flex';
        $('login-email').value = '';
        $('login-password').value = '';
    }

    /**
     * Verifica se existe uma sessão ativa do Supabase Auth ao carregar a página.
     * Se houver sessão válida, verifica permissão e mostra o painel automaticamente
     * (auto-login). Caso contrário, exibe a tela de login.
     */
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

    /**
     * Verifica se o usuário autenticado tem permissão de acesso ao painel.
     *
     * Estratégia de verificação (em ordem de prioridade):
     *   1. Tenta chamar a RPC 'is_current_admin' (definida em supabase-security-hardening.sql).
     *      Se retornar true, busca o papel (role) e barber_id na tabela 'admins'.
     *   2. Se a RPC não existir (hardening SQL ainda não aplicado), permite acesso
     *      por compatibilidade temporária e avisa no console.
     *   3. Em caso de erro na RPC, faz fallback consultando diretamente a tabela 'admins'.
     *
     * @returns {Promise<boolean>} true se o usuário tem acesso de admin/barbeiro.
     */
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

    /**
     * Inicializa o painel administrativo após autenticação bem-sucedida.
     * - Esconde a tela de login e mostra o painel
     * - Se o papel for 'barber', esconde abas restritas e filtra dados
     * - Carrega todos os dados iniciais (dashboard, barbeiros, serviços, etc.)
     * - Inicia o sistema de notificações em tempo real
     * @param {Object} user - Objeto do usuário retornado pelo Supabase Auth.
     */
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

        requestBrowserNotificationPermission();
        startNotifications();
    }

    // ══════════════════════════════════════════════════════════════════════════
    // ═─ NAVEGAÇÃO POR ABAS ═══════════════════════════════════════════════════
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Alterna a aba ativa no painel. Remove a classe 'active' de todas as abas
     * e painéis, e adiciona apenas à aba e painel selecionados.
     * @param {string} tabName - Nome da aba (dashboard, appointments, barbers, etc.)
     */
    function switchTab(tabName) {
        qsa('.nav-tab').forEach(function (t) { t.classList.remove('active'); });
        qsa('.tab-panel').forEach(function (p) { p.classList.remove('active'); });
        var tab = document.querySelector('.nav-tab[data-tab="' + tabName + '"]');
        var panel = $('tab-' + tabName);
        if (tab) tab.classList.add('active');
        if (panel) panel.classList.add('active');
    }

    // ══════════════════════════════════════════════════════════════════════════
    // ═─ DASHBOARD ═════════════════════════════════════════════════════════════
    // ══════════════════════════════════════════════════════════════════════════
    // O dashboard exibe um resumo geral do dia e da semana:
    //   - Número de agendamentos hoje e na semana
    //   - Número de barbeiros ativos
    //   - Faturamento do dia (soma de total_price dos agendamentos)
    //   - Cards por barbeiro com próximo horário
    //   - Lista de agendamentos do dia (filtrável por barbeiro)
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Carrega e exibe os dados do dashboard.
     * Busca agendamentos de hoje, da semana, lista de barbeiros ativos e
     * calcula o faturamento do dia. Para barbeiros (role 'barber'), filtra
     * automaticamente os dados para mostrar apenas os próprios agendamentos.
     */
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

    /**
     * Renderiza os cards de resumo por barbeiro no dashboard.
     * Cada card mostra o nome do barbeiro, número de agendamentos do dia e
     * o próximo horário. Clicar no card filtra os agendamentos exibidos.
     * @param {Array} barbers - Lista de barbeiros ativos.
     * @param {Array} appointments - Agendamentos do dia.
     * @param {string} selectedBarber - ID do barbeiro selecionado (ou vazio para todos).
     */
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

    // ══════════════════════════════════════════════════════════════════════════
    // ═─ AGENDAMENTOS ══════════════════════════════════════════════════════════
    // ══════════════════════════════════════════════════════════════════════════
    // Gerencia os agendamentos da barbearia:
    //   - Listagem paginada com filtros (barbeiro, status, data)
    //   - Detalhes do agendamento em overlay lateral
    //   - Ações: confirmar, concluir, cancelar, reagendar, excluir
    //   - Integração WhatsApp para notificar clientes
    //   - Calendário de reagendamento com verificação de disponibilidade
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Carrega a lista de agendamentos com paginação e filtros.
     * Aplica filtros por barbeiro, status e data. Se o usuário for barbeiro,
     * filtra automaticamente para mostrar apenas seus próprios agendamentos.
     * Utiliza paginação com ITEMS_PER_PAGE (15) itens por página.
     * @param {number} [page=1] - Número da página a carregar.
     */
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

    /**
     * Renderiza uma lista de agendamentos em um container HTML.
     * Usado tanto pelo dashboard (isSimple=true, sem data/telefone) quanto pela
     * listagem completa de agendamentos (isSimple=false).
     * Cada card é clicável e abre os detalhes do agendamento.
     * @param {string} containerId - ID do elemento DOM container.
     * @param {Array} appointments - Lista de agendamentos.
     * @param {boolean} isSimple - Se true, omite data e telefone (modo dashboard).
     */
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

    /**
     * Renderiza os botões de paginação para a listagem de agendamentos.
     * Mostra no máximo 7 números de página com reticências (...) quando necessário.
     * @param {number} total - Total de agendamentos encontrados.
     * @param {number} current - Página atual.
     */
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

    /**
     * Marca um agendamento como 'completed' (concluído).
     * Atualiza o status no banco e recarrega dashboard e listagem.
     * @param {string} id - UUID do agendamento.
     */
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

    /**
     * Abre o WhatsApp com mensagem padrão para contato com o cliente.
     * Adiciona o prefixo do país (55) se necessário.
     * @param {string} phone - Telefone do cliente.
     * @param {string} name - Nome do cliente (não usado na mensagem padrão).
     */
    function openWhatsApp(phone, name) {
        var clean = phone.replace(/\D/g, '');
        if (!clean.startsWith('55')) clean = '55' + clean;
        var text = 'Olá! Sou da Pereira\'s Barber Shop.';
        window.open('https://wa.me/' + clean + '?text=' + encodeURIComponent(text), '_blank');
    }

    /**
     * Busca e exibe os detalhes completos de um agendamento em um overlay.
     * Mostra: cliente, telefone, barbeiro, serviços, data, hora, preço total,
     * observações e link WhatsApp. Botões de ação variam conforme o status:
     *   - pending: Confirmar, Reagendar, Concluir, Cancelar
     *   - confirmed: Reagendar, Concluir, Cancelar
     *   - cancelled/completed: Remover do Histórico
     * @param {string} id - UUID do agendamento.
     */
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

    /** Fecha o overlay de detalhes do agendamento. */
    function closeAppointmentDetails() {
        $('appointment-details-overlay').style.display = 'none';
        window.currentAppointmentId = null;
    }

    /**
     * Gera um link de WhatsApp para contato com o cliente do agendamento.
     * @param {string} phone - Telefone do cliente.
     * @param {string} name - Nome do cliente (usado na saudação).
     * @returns {string} URL completa do WhatsApp (wa.me).
     */
    function getWhatsAppLink(phone, name) {
        var clean = phone.replace(/\D/g, '');
        if (!clean.startsWith('55')) clean = '55' + clean;
        var text = 'Olá, ' + escapeHTML(name) + '! Sou da Pereira\'s Barber Shop.';
        return 'https://wa.me/' + clean + '?text=' + encodeURIComponent(text);
    }

    /**
     * Gera um link de WhatsApp com mensagem de cancelamento/reagendamento.
     * Inclui detalhes do agendamento, pedido de desculpas e link para reagendar.
     * @param {Object} appointment - Objeto completo do agendamento.
     * @returns {string} URL completa do WhatsApp com mensagem de cancelamento.
     */
    function getWhatsAppCancelLink(appointment) {
        var clean = appointment.client_phone.replace(/\D/g, '');
        if (!clean.startsWith('55')) clean = '55' + clean;
        var text = 'Olá, ' + escapeHTML(appointment.client_name) + '! 😊 Gostaríamos de confirmar com você sobre seu agendamento de ' + escapeHTML((appointment.service_names || []).join(', ')) + ' em ' + formatDate(appointment.appointment_date) + ' às ' + formatTime(appointment.appointment_time) + ' com ' + escapeHTML(appointment.barber ? appointment.barber.name : 'Barbeiro') + '.\n\nAlgum imprevisto aconteceu e precisamos fazer um ajuste. Pedimos mil desculpas! ❤️\n\nVocê pode reagendar pelo site: https://www.pereira-barbershop.com.br/agendar.html\n\nAgradecemos desde já! ✂️';
        return 'https://wa.me/' + clean + '?text=' + encodeURIComponent(text);
    }

    /**
     * Confirma um agendamento pendente, alterando status para 'confirmed'.
     * @param {string} id - UUID do agendamento.
     */
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

    /**
     * Prepara o fluxo de cancelamento de um agendamento.
     * Exibe um aviso para o admin notificar o cliente via WhatsApp ANTES de
     * confirmar o cancelamento. Troca os botões do footer para "Reagendar",
     * "Confirmar Cancelamento" e "Voltar".
     * @param {string} id - UUID do agendamento.
     */
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

    /**
     * Inicia o fluxo de reagendamento de um agendamento.
     * Busca os dados completos do agendamento, horários de trabalho do barbeiro
     * e feriados. Abre o modal de reagendamento com calendário interativo.
     * @param {string} id - UUID do agendamento.
     */
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

    /**
     * Renderiza o modal de reagendamento com calendário e seleção de horário.
     * Exibe informações do agendamento atual e o calendário para escolha da nova data.
     * Os botões de navegação de mês avançam/retrocedem o calendário.
     */
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

    /**
     * Renderiza os dias do calendário no modal de reagendamento.
     * Desabilita dias passados, dias em que o barbeiro não trabalha e feriados.
     * Ao clicar em um dia válido, carrega os horários disponíveis.
     */
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

    /**
     * Renderiza os horários disponíveis para reagendamento no dia selecionado.
     * Considera:
     *   - Horário de trabalho do barbeiro (barber_schedules)
     *   - Duração do serviço (para evitar sobreposição)
     *   - Horários já agendados (bookedSlots)
     *   - Horários passados (se a data for hoje)
     * Intervalo entre slots: 30 minutos.
     */
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

    /**
     * Busca os horários já agendados para um barbeiro em uma data específica.
     * Tenta primeiro usar a RPC 'get_public_booked_slots' (mais eficiente).
     * Se a RPC não existir, faz fallback consultando a tabela 'appointments'.
     * @param {string} barberId - UUID do barbeiro.
     * @param {string} date - Data no formato "YYYY-MM-DD".
     * @returns {Promise<Array>} Lista de agendamentos com appointment_time e total_duration.
     */
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

    /**
     * Confirma o reagendamento, atualizando data e hora no banco.
     * Após o sucesso, exibe uma tela de confirmação com link para notificar
     * o cliente via WhatsApp com os detalhes da mudança.
     */
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

    /**
     * Gera um link de WhatsApp com mensagem de notificação de reagendamento.
     * Mostra a data/hora anterior e a nova data/hora.
     * @param {Object} appointment - Dados do agendamento original.
     * @returns {string} URL completa do WhatsApp com mensagem formatada.
     */
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

    /**
     * Fecha o modal de reagendamento e reseta o estado de reagendamento.
     * Limpa todos os dados temporários (agendamento, calendário, horários).
     */
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

    /**
     * Confirma o cancelamento de um agendamento, alterando status para 'cancelled'.
     * Chamado após o admin notificar o cliente via WhatsApp.
     * @param {string} id - UUID do agendamento.
     */
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

    /**
     * Remove permanentemente um agendamento do banco de dados (hard delete).
     * Usado para limpar o histórico de agendamentos cancelados/concluídos.
     * Exige confirmação prévia do usuário.
     * @param {string} id - UUID do agendamento.
     */
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

    // ══════════════════════════════════════════════════════════════════════════
    // ═─ BARBEIROS (CRUD) ══════════════════════════════════════════════════════
    // ══════════════════════════════════════════════════════════════════════════
    // CRUD completo de barbeiros:
    //   - Listagem com foto, telefone, horários de trabalho, badge Telegram
    //   - Criar/Editar com formulário de horários por dia da semana
    //   - Upload de foto de perfil (Supabase Storage)
    //   - Ativar/Desativar/Excluir
    //   - Gerenciamento de horários na tabela barber_schedules
    // ══════════════════════════════════════════════════════════════════════════

    /** Cache local dos horários de trabalho de cada barbeiro, indexado por barber_id. */
    var _barberSchedules = {};

    /**
     * Estado temporário do fluxo de reagendamento. Mantém dados do agendamento
     * original, calendário, seleções do usuário, horários do barbeiro e feriados.
     */
    var _rescheduleState = {
        appointment: null,
        calendarDate: new Date(),
        selectedDate: null,
        selectedTime: null,
        barberSchedule: {},
        holidays: []
    };

    /**
     * Carrega a lista de barbeiros e seus horários do banco.
     * Atualiza o cache local (_barberSchedules), renderiza os cards de barbeiros
     * e popula os dropdowns de filtro (na listagem de agendamentos e no dashboard).
     */
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

    /**
     * Gera um resumo textual dos horários de trabalho de um barbeiro.
     * Agrupa dias consecutivos com o mesmo horário em intervalos.
     * Ex: "Seg-Sex 09:00-19:00, Sáb 09:00-17:00"
     * @param {string} barberId - ID do barbeiro.
     * @returns {string} Resumo formatado ou "Sem horário configurado".
     */
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

    /**
     * Renderiza os cards de barbeiros na seção de gerenciamento.
     * Cada card mostra: foto, nome, telefone, horários, badges (ativo/inativo,
     * Telegram) e botões de ação (Editar, Ativar/Desativar, Excluir).
     * @param {Array} barbers - Lista de barbeiros.
     */
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
            var phoneHtml = b.phone ? '<div class="card-detail">&#128222; ' + escapeHTML(b.phone) + '</div>' : '';
            var telegramBadge = b.telegram_chat_id ? ' <span class="badge-featured" style="background:rgba(0,136,204,0.1);color:#0088cc"><i class="fab fa-telegram"></i> Telegram</span>' : '';
            var photoHtml = b.photo_url
                ? '<div class="card-barber-photo"><img src="' + escapeHTML(b.photo_url) + '" alt="' + escapeHTML(b.name) + '"></div>'
                : '<div class="card-barber-photo card-barber-photo-placeholder"><i class="fas fa-user"></i></div>';
            return '<div class="manage-card ' + (b.active ? '' : 'inactive') + '">' +
                '<span class="card-badge ' + badgeClass + '">' + badgeText + '</span>' +
                holidayBadge +
                telegramBadge +
                photoHtml +
                '<h4>' + escapeHTML(b.name) + '</h4>' +
                phoneHtml +
                '<div class="card-detail">&#128336; ' + scheduleStr + '</div>' +
                '<div class="card-actions">' +
                    '<button class="btn-outline btn-sm" onclick="AdminApp.editBarber(\'' + jsString(b.id) + '\')">Editar</button>' +
                    '<button class="btn-outline btn-sm" onclick="AdminApp.toggleBarber(\'' + jsString(b.id) + '\', ' + !b.active + ')">' + (b.active ? 'Desativar' : 'Ativar') + '</button>' +
                    '<button class="btn-outline btn-sm btn-danger" onclick="AdminApp.deleteBarber(\'' + jsString(b.id) + '\')">Excluir</button>' +
                '</div>' +
            '</div>';
        }).join('');
    }

    /**
     * Exibe o formulário de criação/edição de barbeiro em um modal.
     * O formulário inclui: nome, telefone, Telegram Chat ID, foto de perfil
     * (com upload e preview) e grade de horários por dia da semana.
     *
     * Lógica de salvamento:
     *   - Se edição: faz UPDATE na tabela 'barbers', DELETE+INSERT nas schedules
     *   - Se criação: faz INSERT na tabela 'barbers' (com sort_order auto), INSERT nas schedules
     *   - Upload de foto: usa Supabase Storage (bucket 'barber-photos')
     *
     * @param {Object|null} barber - Dados do barbeiro (null para novo).
     * @param {Array} [schedules] - Horários existentes do barbeiro.
     */
    function showBarberForm(barber, schedules) {
        var isEdit = !!barber;
        var title = isEdit ? 'Editar Barbeiro' : 'Novo Barbeiro';
        var name = isEdit ? barber.name : '';
        var phone = isEdit ? (barber.phone || '') : '';
        var telegramChatId = isEdit ? (barber.telegram_chat_id || '') : '';
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
            '<div class="form-group"><label><i class="fas fa-phone"></i> Telefone</label><input type="tel" id="field-phone" value="' + escapeHTML(phone) + '" placeholder="(15) 99999-9999"></div>' +
            '<div class="form-group"><label><i class="fab fa-telegram"></i> Telegram Chat ID <span style="font-weight:400;font-size:0.75rem;color:var(--gray-400)">(para notificacoes)</span></label>' +
                '<input type="text" id="field-telegram" value="' + escapeHTML(telegramChatId) + '" placeholder="Ex: 123456789">' +
                '<div class="barber-photo-hint" style="margin-top:6px">Para descobrir o Chat ID: o barbeiro envia /start para o bot no Telegram, depois acesse <code style="background:var(--gray-100);padding:1px 4px;border-radius:3px">https://api.telegram.org/bot{TOKEN}/getUpdates</code> e procure por chat.id</div>' +
            '</div>' +
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
                  name: newName,
                  phone: ($('field-phone').value || '').trim() || null,
                  telegram_chat_id: ($('field-telegram').value || '').trim() || null
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

    /**
     * Carrega dados de um barbeiro e abre o formulário de edição.
     * @param {string} id - UUID do barbeiro.
     */
    async function editBarber(id) {
        var result = await sb.from('barbers').select('*').eq('id', id).single();
        if (result.data) {
            var schedResult = await sb.from('barber_schedules').select('*').eq('barber_id', id);
            showBarberForm(result.data, schedResult.data || []);
        }
    }

    /**
     * Ativa ou desativa um barbeiro (toggle do campo 'active').
     * @param {string} id - UUID do barbeiro.
     * @param {boolean} active - Novo estado (true=ativo, false=inativo).
     */
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

    /**
     * Exclui um barbeiro permanentemente (com confirmação prévia).
     * NOTA: Agendamentos vinculados podem ser afetados dependendo das
     * constraints do banco (ON DELETE CASCADE ou SET NULL).
     * @param {string} id - UUID do barbeiro.
     */
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

    // ══════════════════════════════════════════════════════════════════════════
    // ═─ SERVIÇOS (CRUD) ══════════════════════════════════════════════════════
    // ══════════════════════════════════════════════════════════════════════════
    // CRUD completo de serviços da barbearia:
    //   - Listagem com nome, preço, duração, badge "MAIS PEDIDO"
    //   - Criar/Editar com formulário (nome, preço, duração, destaque)
    //   - Ativar/Desativar/Excluir
    //   - Ordenação por sort_order
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Carrega a lista de serviços do banco e renderiza os cards.
     */
    async function loadServices() {
        try {
            var result = await sb.from('services').select('*').order('sort_order').order('name');
            renderServices(result.data || []);
        } catch (err) {
            $('services-list').innerHTML = '<p class="empty-state">Erro ao carregar servicos.</p>';
        }
    }

    /**
     * Renderiza os cards de serviços na seção de gerenciamento.
     * Cada card mostra: nome, preço, duração formatada, badges (ativo/inativo,
     * "MAIS PEDIDO") e botões de ação.
     * @param {Array} services - Lista de serviços.
     */
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

    /**
     * Exibe o formulário de criação/edição de serviço em um modal.
     * Inclui campos: nome, preço (R$), duração (minutos) e checkbox "MAIS PEDIDO".
     * Ao criar, define sort_order automaticamente e active=true.
     * @param {Object|null} service - Dados do serviço (null para novo).
     */
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

    /**
     * Carrega dados de um serviço e abre o formulário de edição.
     * @param {string} id - UUID do serviço.
     */
    async function editService(id) {
        var result = await sb.from('services').select('*').eq('id', id).single();
        if (result.data) showServiceForm(result.data);
    }

    /**
     * Ativa ou desativa um serviço (toggle do campo 'active').
     * @param {string} id - UUID do serviço.
     * @param {boolean} active - Novo estado.
     */
    async function toggleService(id, active) {
        var result = await sb.from('services').update({ active: active }).eq('id', id);
        if (result.error) {
            toast('Erro: ' + result.error.message, 'error');
        } else {
            toast(active ? 'Serviço ativado!' : 'Serviço desativado.', 'success');
            loadServices();
        }
    }

    /**
     * Exclui um serviço permanentemente (com confirmação prévia).
     * @param {string} id - UUID do serviço.
     */
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

    // ══════════════════════════════════════════════════════════════════════════
    // ═─ PRODUTOS DA LOJINHA (CRUD) ════════════════════════════════════════════
    // ══════════════════════════════════════════════════════════════════════════
    // CRUD completo de produtos da lojinha:
    //   - Listagem com foto, nome, descrição, preço, controle de estoque
    //   - Criar/Editar com upload de foto (Supabase Storage)
    //   - Ativar/Desativar/Excluir
    //   - Badges de estoque: esgotado (vermelho), baixo (amarelo), ok (verde)
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Carrega a lista de produtos do banco e renderiza os cards.
     */
    async function loadProducts() {
        try {
            var result = await sb.from('products').select('*').order('sort_order').order('name');
            renderProducts(result.data || []);
        } catch (err) {
            $('products-list').innerHTML = '<p class="empty-state">Erro ao carregar produtos.</p>';
        }
    }

    /**
     * Renderiza os cards de produtos na seção de gerenciamento.
     * Cada card mostra: foto, nome, descrição, preço, status de estoque
     * (esgotado/baixo/ok) e botões de ação.
     * @param {Array} products - Lista de produtos.
     */
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

    /**
     * Exibe o formulário de criação/edição de produto em um modal.
     * Inclui campos: nome, descrição, preço, estoque e upload de foto.
     * Upload de foto usa Supabase Storage (bucket 'product-photos').
     * Ao criar, define sort_order automaticamente e active=true.
     * @param {Object|null} product - Dados do produto (null para novo).
     */
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

    /**
     * Carrega dados de um produto e abre o formulário de edição.
     * @param {string} id - UUID do produto.
     */
    async function editProduct(id) {
        var result = await sb.from('products').select('*').eq('id', id).single();
        if (result.data) showProductForm(result.data);
    }

    /**
     * Ativa ou desativa um produto (toggle do campo 'active').
     * @param {string} id - UUID do produto.
     * @param {boolean} active - Novo estado.
     */
    async function toggleProduct(id, active) {
        var result = await sb.from('products').update({ active: active }).eq('id', id);
        if (result.error) {
            toast('Erro: ' + result.error.message, 'error');
        } else {
            toast(active ? 'Produto ativado!' : 'Produto desativado.', 'success');
            loadProducts();
        }
    }

    /**
     * Exclui um produto permanentemente (com confirmação prévia).
     * @param {string} id - UUID do produto.
     */
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

    // ══════════════════════════════════════════════════════════════════════════
    // ═─ PEDIDOS DE PRODUTOS (Reservas) ═══════════════════════════════════════
    // ══════════════════════════════════════════════════════════════════════════
    // Gerencia os pedidos/reservas de produtos feitos pelos clientes:
    //   - Listagem com filtro por status (reserved, picked_up, cancelled)
    //   - Ações: marcar como retirado, cancelar, excluir
    //   - Link WhatsApp para contato com o cliente
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Carrega a lista de pedidos de produtos com filtro por status.
     */
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

    /**
     * Renderiza os cards de pedidos de produtos.
     * Cada card mostra: nome e telefone do cliente, itens com quantidades,
     * preço total, data/hora, status e botões de ação (retirado, cancelar,
     * excluir, WhatsApp).
     * @param {Array} orders - Lista de pedidos.
     */
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

    /**
     * Marca um pedido de produto como 'picked_up' (retirado pelo cliente).
     * @param {string} id - UUID do pedido.
     */
    async function markOrderPickedUp(id) {
        var result = await sb.from('product_orders').update({ status: 'picked_up' }).eq('id', id);
        if (result.error) {
            toast('Erro: ' + result.error.message, 'error');
        } else {
            toast('Pedido marcado como retirado!', 'success');
            loadProductOrders();
        }
    }

    /**
     * Cancela um pedido de produto (status → 'cancelled'), com confirmação prévia.
     * @param {string} id - UUID do pedido.
     */
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

    /**
     * Remove permanentemente um pedido de produto (hard delete).
     * Exige confirmação prévia do usuário.
     * @param {string} id - UUID do pedido.
     */
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

    // ══════════════════════════════════════════════════════════════════════════
    // ═─ GERENCIAMENTO DE USUÁRIOS (Admins/Barbeiros) ═════════════════════════
    // ══════════════════════════════════════════════════════════════════════════
    // Gerencia os usuários com acesso ao painel administrativo:
    //   - Listagem de admins com papel (role) e barbeiro vinculado
    //   - Criar novo usuário (Supabase Auth signUp + registro na tabela admins)
    //   - Editar papel (admin ↔ barbeiro) e barbeiro vinculado
    //   - Resetar senha (envia email via Supabase Auth)
    //   - Remover acesso (remove da tabela admins, mantém no Auth)
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Carrega e renderiza a lista de usuários administradores/barbeiros.
     * Mostra email, papel (admin/barbeiro), barbeiro vinculado (se aplicável)
     * e botões de ação. O usuário atual é marcado com "(você)".
     */
    async function loadAdmins() {
        try {
            // Carregar barbeiros para o dropdown
            var barbersResult = await sb.from('barbers').select('id, name').order('sort_order');
            var barbersList = barbersResult.data || [];

            var result = await sb.from('admins').select('*').order('created_at', { ascending: true });
            var admins = result.data || [];
            var container = $('admins-list');

            var session = await sb.auth.getSession();
            var currentUserId = session.data.session ? session.data.session.user.id : '';

            if (!admins.length) {
                container.innerHTML = '<p class="empty-state">Nenhum usuário encontrado.</p>';
                return;
            }

            var html = '';
            admins.forEach(function (a) {
                var isMe = a.user_id === currentUserId;
                var role = a.role || 'admin';
                var barberName = '';
                if (role === 'barber' && a.barber_id) {
                    var found = barbersList.find(function (b) { return b.id === a.barber_id; });
                    barberName = found ? found.name : '';
                }

                var roleIcon = role === 'barber' ? 'fa-user-scissors' : 'fa-shield-halved';
                var roleLabel = role === 'barber' ? 'Barbeiro' + (barberName ? ': ' + escapeHTML(barberName) : '') : 'Administrador';
                var roleBadgeClass = role === 'barber' ? 'status-barber' : 'status-confirmed';

                html += '<div class="admin-card">' +
                    '<div class="admin-card-info">' +
                        '<div class="admin-avatar">' + escapeHTML(a.email.charAt(0).toUpperCase()) + '</div>' +
                        '<div>' +
                            '<div class="admin-name">' + escapeHTML(a.email) + (isMe ? ' <span style="font-size:0.75rem;color:var(--gold-dim);">(você)</span>' : '') + '</div>' +
                            '<div class="admin-role"><i class="fas ' + roleIcon + '"></i> ' + roleLabel + '</div>' +
                        '</div>' +
                    '</div>' +
                    '<div class="admin-card-actions">' +
                        '<span class="status-badge ' + roleBadgeClass + '">' + (role === 'barber' ? 'Barbeiro' : 'Admin') + '</span>' +
                        (isMe ? '' : '<button class="btn-icon" onclick="AdminApp.editAdminRole(\'' + jsString(a.user_id) + '\')" title="Alterar permissão"><i class="fas fa-user-pen"></i></button>' +
                        '<button class="btn-icon success" onclick="AdminApp.resetAdminPassword(\'' + jsString(a.email) + '\')" title="Resetar senha"><i class="fas fa-key"></i></button>' +
                        '<button class="btn-icon danger" onclick="AdminApp.removeAdmin(\'' + a.user_id + '\', \'' + jsString(a.email) + '\')" title="Remover"><i class="fas fa-trash-alt"></i></button>') +
                    '</div>' +
                '</div>';
            });

            container.innerHTML = html;
        } catch (err) {
            $('admins-list').innerHTML = '<p class="empty-state">Erro ao carregar usuários.</p>';
        }
    }

    /**
     * Exibe o formulário para adicionar um novo usuário ao painel.
     * Inclui: email, senha, papel (admin/barbeiro) e barbeiro vinculado.
     * O campo de barbeiro aparece apenas quando o papel é 'barber'.
     */
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
            '<div class="form-group">' +
                '<label><i class="fas fa-user-tag"></i> Permissão</label>' +
                '<select id="admin-new-role" style="font-size:16px">' +
                    '<option value="admin"><i class="fas fa-shield-halved"></i> Administrador (acesso total)</option>' +
                    '<option value="barber"><i class="fas fa-user-scissors"></i> Barbeiro (só agenda própria)</option>' +
                '</select>' +
            '</div>' +
            '<div class="form-group" id="admin-barber-select-group" style="display:none">' +
                '<label><i class="fas fa-user-scissors"></i> Barbeiro vinculado</label>' +
                '<select id="admin-new-barber-id" style="font-size:16px">' +
                    '<option value="">Selecione o barbeiro...</option>' +
                '</select>' +
            '</div>' +
            '<p style="font-size:0.8rem;color:var(--gray-600);margin-top:8px;">O novo usuário receberá um email de confirmação (se ativado no Supabase).</p>';

        showModal('Novo Usuário', html, function () {
            addNewAdmin();
        }, function () {
            var emailInput = $('admin-new-email');
            if (emailInput) emailInput.focus();

            // Toggle barber select visibility
            var roleSelect = $('admin-new-role');
            var barberGroup = $('admin-barber-select-group');
            if (roleSelect && barberGroup) {
                roleSelect.addEventListener('change', function () {
                    barberGroup.style.display = this.value === 'barber' ? 'block' : 'none';
                    if (this.value === 'barber') {
                        loadBarbersForSelect('admin-new-barber-id');
                    }
                });
            }
        });
    }

    /**
     * Popula um dropdown de seleção de barbeiros com dados do banco.
     * Usado nos formulários de criação e edição de admins.
     * @param {string} selectId - ID do elemento <select> a popular.
     */
    async function loadBarbersForSelect(selectId) {
        try {
            var result = await sb.from('barbers').select('id, name').order('sort_order');
            var barbers = result.data || [];
            var sel = $(selectId);
            if (!sel) return;
            sel.innerHTML = '<option value="">Selecione o barbeiro...</option>';
            barbers.forEach(function (b) {
                sel.innerHTML += '<option value="' + b.id + '">' + escapeHTML(b.name) + '</option>';
            });
        } catch (err) {}
    }

    /**
     * Cria um novo usuário no sistema:
     *   1. Registra no Supabase Auth (signUp com email + senha)
     *   2. Insere na tabela 'admins' com papel e barbeiro vinculado
     * Trata erros comuns (email já cadastrado, senha curta, etc.).
     */
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
                active: true,
                role: $('admin-new-role') ? $('admin-new-role').value : 'admin',
                barber_id: ($('admin-new-barber-id') && $('admin-new-barber-id').value) ? $('admin-new-barber-id').value : null
            });

            if (insertResult.error) {
                toast('Usuário criado no Auth mas erro ao adicionar na tabela admins: ' + insertResult.error.message, 'error');
                hideModal();
                return;
            }

            toast('Usuário ' + email + ' criado com sucesso!', 'success');
            hideModal();
            loadAdmins();
        } catch (err) {
            toast('Erro: ' + (err.message || 'Tente novamente.'), 'error');
        }
    }

    /**
     * Abre o formulário para editar o papel de um usuário existente.
     * Permite alterar entre 'admin' e 'barbeiro' e selecionar o barbeiro vinculado.
     * @param {string} userId - UUID do usuário (auth.users.id).
     */
    async function editAdminRole(userId) {
        try {
            // Buscar dados atuais do admin
            var adminResult = await sb.from('admins').select('*').eq('user_id', userId).single();
            if (!adminResult.data) { toast('Usuário não encontrado.', 'error'); return; }
            var adm = adminResult.data;

            // Carregar barbeiros
            var barbersResult = await sb.from('barbers').select('id, name').order('sort_order');
            var barbersList = barbersResult.data || [];

            var barbersOptions = '<option value="">Selecione o barbeiro...</option>';
            barbersList.forEach(function (b) {
                barbersOptions += '<option value="' + b.id + '"' + (adm.barber_id === b.id ? ' selected' : '') + '>' + escapeHTML(b.name) + '</option>';
            });

            var html =
                '<div class="form-group">' +
                    '<label><i class="fas fa-user-tag"></i> Permissão</label>' +
                    '<select id="edit-role" style="font-size:16px">' +
                        '<option value="admin"' + (adm.role === 'admin' ? ' selected' : '') + '>Administrador (acesso total)</option>' +
                        '<option value="barber"' + (adm.role === 'barber' ? ' selected' : '') + '>Barbeiro (só agenda própria)</option>' +
                    '</select>' +
                '</div>' +
                '<div class="form-group" id="edit-barber-group" style="display:' + (adm.role === 'barber' ? 'block' : 'none') + '">' +
                    '<label><i class="fas fa-user-scissors"></i> Barbeiro vinculado</label>' +
                    '<select id="edit-barber-id" style="font-size:16px">' + barbersOptions + '</select>' +
                '</div>';

            showModal('Alterar Permissão — ' + adm.email, html, async function () {
                var newRole = $('edit-role').value;
                var newBarberId = ($('edit-barber-id') && $('edit-barber-id').value) ? $('edit-barber-id').value : null;

                if (newRole === 'barber' && !newBarberId) {
                    toast('Selecione o barbeiro vinculado.', 'error');
                    return;
                }

                var updateData = { role: newRole, barber_id: newBarberId };
                var result = await sb.from('admins').update(updateData).eq('user_id', userId);
                if (result.error) {
                    toast('Erro: ' + result.error.message, 'error');
                } else {
                    hideModal();
                    toast('Permissão atualizada!', 'success');
                    loadAdmins();
                }
            }, function () {
                var roleSelect = $('edit-role');
                var barberGroup = $('edit-barber-group');
                if (roleSelect && barberGroup) {
                    roleSelect.addEventListener('change', function () {
                        barberGroup.style.display = this.value === 'barber' ? 'block' : 'none';
                    });
                }
            });
        } catch (err) {
            toast('Erro ao carregar dados do usuário.', 'error');
        }
    }

    /**
     * Remove um usuário da tabela 'admins', revogando seu acesso ao painel.
     * O usuário continua existindo no Supabase Auth, mas não poderá mais
     * fazer login no painel.
     * @param {string} userId - UUID do usuário.
     * @param {string} email - Email do usuário (para exibição na confirmação).
     */
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

    /**
     * Envia um email de redefinição de senha para um usuário via Supabase Auth.
     * O link de redefinição redireciona para a página admin.html.
     * @param {string} email - Email do usuário.
     */
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

    // ══════════════════════════════════════════════════════════════════════════
    // ═─ NOTIFICAÇÕES EM TEMPO REAL ═══════════════════════════════════════════
    // ══════════════════════════════════════════════════════════════════════════
    // Sistema de notificação de novos agendamentos com múltiplos canais:
    //
    //   1. Polling (fallback garantido):
    //      - A cada 15 segundos, consulta agendamentos do dia
    //      - Compara com IDs já conhecidos para detectar novos
    //
    //   2. Supabase Realtime (tempo real, quando disponível):
    //      - Inscreve-se em INSERT/UPDATE/DELETE na tabela 'appointments'
    //      - Se falhar, o polling continua funcionando normalmente
    //
    //   3. Notificações do navegador (Browser Notification API):
    //      - Solicita permissão ao abrir o painel
    //      - Exibe popup com ícone e som de notificação
    //
    //   4. Telegram Bot (opcional):
    //      - Envia mensagem HTML para o chat do barbeiro via Telegram API
    //      - Requer TELEGRAM_BOT_TOKEN configurado em supabase-config.js
    //
    //   5. Badge de notificação:
    //      - Contador de agendamentos não vistos no ícone do sino
    //      - Painel dropdown com lista de agendamentos do dia
    // ══════════════════════════════════════════════════════════════════════════

    /** Mapa de IDs de agendamentos já conhecidos (evita notificar o mesmo agendamento duas vezes). */
    var _knownAppointmentIds = {};
    /** Mapa de IDs de agendamentos já vistos pelo usuário (controla o badge de notificação). */
    var _seenAppointmentIds = {};
    /** Contexto de áudio para o som de notificação (criado sob demanda). */
    var _audioCtx = null;
    /** Canal de inscrição Realtime (para limpeza no logout). */
    var _realtimeSubscription = null;
    /** Referência do intervalo de polling (para limpeza no logout). */
    var _pollingInterval = null;
    /** Última contagem de agendamentos conhecida (para detectar novos via polling). */
    var _lastPolledCount = -1;
    /** Cache de dados de barbeiros para envio de notificações Telegram. */
    var _barberCache = {};

    /**
     * Envia uma notificação via Telegram Bot API para o barbeiro.
     * Requer que o barbeiro tenha telegram_chat_id configurado e que
     * TELEGRAM_BOT_TOKEN esteja definido em supabase-config.js.
     * @param {string} barberId - UUID do barbeiro.
     * @param {string} message - Mensagem HTML a enviar.
     */
    function sendTelegramNotification(barberId, message) {
        if (!TELEGRAM_BOT_TOKEN) return;
        var barber = _barberCache[barberId];
        if (!barber || !barber.telegram_chat_id) return;
        fetch('https://api.telegram.org/bot' + TELEGRAM_BOT_TOKEN + '/sendMessage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: barber.telegram_chat_id,
                text: message,
                parse_mode: 'HTML'
            })
        }).catch(function (e) {
            console.warn('Telegram send failed:', e);
        });
    }

    /**
     * Carrega dados dos barbeiros para o cache de notificações Telegram.
     * Executado uma vez ao iniciar o sistema de notificações.
     */
    function cacheBarbersForNotifications() {
        sb.from('barbers').select('id, name, telegram_chat_id').then(function (result) {
            _barberCache = {};
            (result.data || []).forEach(function (b) { _barberCache[b.id] = b; });
        });
    }

    /**
     * Reproduz um som de notificação usando Web Audio API.
     * Toca uma sequência de notas musicais (880Hz → 1100Hz → 1320Hz) para
     * alertar sobre novos agendamentos. Seguro contra erros (try/catch).
     */
    function playNotificationSound() {
        try {
            if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            var ctx = _audioCtx;
            var notes = [
                { freq: 880, start: 0, dur: 0.15 },
                { freq: 0, start: 0.15, dur: 0.05 },
                { freq: 1100, start: 0.2, dur: 0.15 },
                { freq: 0, start: 0.35, dur: 0.05 },
                { freq: 1320, start: 0.4, dur: 0.3 }
            ];
            notes.forEach(function (n) {
                if (n.freq === 0) return;
                var osc = ctx.createOscillator();
                var gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(n.freq, ctx.currentTime + n.start);
                gain.gain.setValueAtTime(0.8, ctx.currentTime + n.start);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + n.start + n.dur);
                osc.start(ctx.currentTime + n.start);
                osc.stop(ctx.currentTime + n.start + n.dur + 0.05);
            });
        } catch (e) {}
    }

    /**
     * Solicita permissão do usuário para notificações do navegador.
     * Chamada ao abrir o painel. Só solicita se ainda não foi decidido.
     */
    function requestBrowserNotificationPermission() {
        if (!('Notification' in window)) return;
        if (Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }

    /**
     * Exibe uma notificação nativa do navegador (Browser Notification API).
     * Clicar na notificação traz a janela para frente e navega ao dashboard.
     * A notificação se fecha automaticamente após 8 segundos.
     * @param {string} title - Título da notificação.
     * @param {string} body - Corpo da mensagem.
     */
    function showBrowserNotification(title, body) {
        if (!('Notification' in window) || Notification.permission !== 'granted') return;
        try {
            var n = new Notification(title, {
                body: body,
                icon: 'logo.png',
                badge: 'logo.png',
                tag: 'pereira-appointment-' + Date.now()
            });
            n.onclick = function () {
                window.focus();
                switchTab('dashboard');
                n.close();
            };
            setTimeout(function () { n.close(); }, 8000);
        } catch (e) {}
    }

    /**
     * Atualiza o badge de notificação e detecta novos agendamentos.
     * Compara a lista atual de agendamentos com os IDs já conhecidos.
     * Se houver novos agendamentos (e não for a primeira carga):
     *   - Exibe notificação do navegador
     *   - Reproduz som de alerta
     *   - Mostra toast
     *   - Envia notificação Telegram para o barbeiro
     *   - Recarrega dashboard e listagem
     * Também atualiza o badge com número de agendamentos não vistos.
     */
    function updateNotificationBadge() {
        var today = todayStr();
        var query = sb.from('appointments').select('id, appointment_time, client_name, status, barber:barbers(name), service_names').eq('appointment_date', today).neq('status', 'cancelled').order('appointment_time');
        if (currentUserRole === 'barber' && currentUserBarberId) {
            query = query.eq('barber_id', currentUserBarberId);
        }
        query.then(function (result) {
            var appointments = result.data || [];
            var allIds = appointments.map(function (a) { return a.id; });
            var newIds = allIds.filter(function (id) { return !_knownAppointmentIds[id]; });

            if (newIds.length > 0 && _lastPolledCount >= 0) {
                newIds.forEach(function (id) { _knownAppointmentIds[id] = true; });
                var newAppts = appointments.filter(function (a) { return newIds.indexOf(a.id) >= 0; });
                newAppts.forEach(function (a) {
                    var clientName = a.client_name || 'Cliente';
                    var time = a.appointment_time ? formatTime(a.appointment_time) : '';
                    var barberName = a.barber ? a.barber.name : 'Barbeiro';
                    var services = (a.service_names || []).join(', ');
                    showBrowserNotification(
                        'Novo Agendamento!',
                        clientName + ' às ' + time + ' com ' + barberName + ' — ' + services
                    );
                    playNotificationSound();
                    toast('Novo agendamento: ' + clientName + ' às ' + time, 'success');

                    var date = formatDate(a.appointment_date || todayStr());
                    var tgMsg = '\u2702 <b>Novo Agendamento!</b>\n\n' +
                        '\uD83D\uDC64 <b>Cliente:</b> ' + escapeHTML(clientName) + '\n' +
                        '\uD83D\uDD52 <b>Horario:</b> ' + time + '\n' +
                        '\uD83D\uDC87 <b>Servico:</b> ' + escapeHTML(services) + '\n' +
                        '\uD83D\uDCC5 <b>Data:</b> ' + date + '\n\n' +
                        'Pereira\'s Barber Shop';
                    sendTelegramNotification(a.barber_id, tgMsg);
                });

                var btn = $('btn-notifications');
                if (btn) {
                    btn.classList.add('has-new');
                    setTimeout(function () { btn.classList.remove('has-new'); }, 700);
                }

                loadDashboard();
                loadAppointments(currentPage);
            }

            _lastPolledCount = appointments.length;

            var unseenCount = allIds.filter(function (id) { return !_seenAppointmentIds[id]; }).length;
            var badge = $('notification-badge');
            if (unseenCount > 0) {
                badge.textContent = unseenCount > 9 ? '9+' : unseenCount;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }

            renderNotificationPanel(appointments);
        });
    }

    /**
     * Renderiza o painel dropdown de notificações com a lista de agendamentos do dia.
     * Agendamentos passados são exibidos com estilo atenuado ('past').
     * @param {Array} appointments - Lista de agendamentos do dia.
     */
    function renderNotificationPanel(appointments) {
        var panelDate = $('notification-panel-date');
        var panelList = $('notification-panel-list');
        if (panelDate) panelDate.textContent = formatDate(todayStr());

        if (!appointments.length) {
            panelList.innerHTML = '<p class="notification-empty"><i class="fas fa-calendar-check"></i> Nenhum agendamento para hoje</p>';
            return;
        }

        var now = new Date();
        var nowMin = now.getHours() * 60 + now.getMinutes();

        panelList.innerHTML = appointments.map(function (a) {
            var time = formatTime(a.appointment_time);
            var tParts = time.split(':');
            var apptMin = parseInt(tParts[0]) * 60 + parseInt(tParts[1]);
            var isPast = apptMin < nowMin;
            var statusLabel = { confirmed: 'Confirmado', pending: 'Pendente', cancelled: 'Cancelado', completed: 'Concluído' }[a.status] || a.status;
            var statusClass = 'status-' + a.status;
            var barberName = a.barber ? a.barber.name : 'Barbeiro';
            var services = (a.service_names || []).join(', ');

            return '<div class="notification-item' + (isPast ? ' past' : '') + '">' +
                '<div class="notification-item-time">' + time + '</div>' +
                '<div class="notification-item-info">' +
                    '<div class="notification-item-name">' + escapeHTML(a.client_name) + '</div>' +
                    '<div class="notification-item-meta">' + escapeHTML(barberName) + ' &bull; ' + escapeHTML(services) + '</div>' +
                '</div>' +
                '<span class="notification-item-status ' + statusClass + '">' + statusLabel + '</span>' +
            '</div>';
        }).join('');
    }

    /**
     * Alterna a visibilidade do painel de notificações (dropdown).
     * Ao abrir, marca todos os agendamentos como vistos e esconde o badge.
     * Ao fechar, apenas esconde o painel.
     */
    function toggleNotificationPanel() {
        var panel = $('notification-panel');
        var isVisible = panel.style.display !== 'none';
        if (isVisible) {
            panel.style.display = 'none';
        } else {
            var today = todayStr();
            var query = sb.from('appointments').select('id').eq('appointment_date', today).neq('status', 'cancelled');
            if (currentUserRole === 'barber' && currentUserBarberId) {
                query = query.eq('barber_id', currentUserBarberId);
            }
            query.then(function (result) {
                (result.data || []).forEach(function (a) { _seenAppointmentIds[a.id] = true; });
                $('notification-badge').style.display = 'none';
            });
            panel.style.display = 'block';
            updateNotificationBadge();
        }
    }

    /**
     * Inicializa o sistema de notificações:
     *   1. Carrega agendamentos atuais (para não notificar os existentes)
     *   2. Inicia o polling (a cada 15 segundos)
     *   3. Tenta inscrição Realtime (fallback: polling funciona normalmente)
     *   4. Carrega cache de barbeiros para notificações Telegram
     */
    function startNotifications() {
        var today = todayStr();
        var query = sb.from('appointments').select('id').eq('appointment_date', today).neq('status', 'cancelled');
        if (currentUserRole === 'barber' && currentUserBarberId) {
            query = query.eq('barber_id', currentUserBarberId);
        }
        query.then(function (result) {
            (result.data || []).forEach(function (a) {
                _knownAppointmentIds[a.id] = true;
                _seenAppointmentIds[a.id] = true;
            });
            _lastPolledCount = (result.data || []).length;
            updateNotificationBadge();
            cacheBarbersForNotifications();
            startPolling();
            tryRealtimeSubscription();
        });
    }

    /**
     * Inicia o intervalo de polling para verificar novos agendamentos.
     * Executa updateNotificationBadge() a cada 15 segundos.
     */
    function startPolling() {
        if (_pollingInterval) clearInterval(_pollingInterval);
        _pollingInterval = setInterval(function () {
            updateNotificationBadge();
        }, 15000);
    }

    /**
     * Tenta criar uma inscrição Realtime no canal 'admin-appointments'.
     * Escuta eventos INSERT, UPDATE e DELETE na tabela 'appointments'.
     * Se falhar (CHANNEL_ERROR/TIMED_OUT), o polling continua como fallback.
     */
    function tryRealtimeSubscription() {
        try {
            var channel = sb
                .channel('admin-appointments')
                .on('postgres_changes',
                    { event: 'INSERT', schema: 'public', table: 'appointments' },
                    function () { updateNotificationBadge(); }
                )
                .on('postgres_changes',
                    { event: 'UPDATE', schema: 'public', table: 'appointments' },
                    function () { updateNotificationBadge(); }
                )
                .on('postgres_changes',
                    { event: 'DELETE', schema: 'public', table: 'appointments' },
                    function () { updateNotificationBadge(); }
                )
                .subscribe(function (status) {
                    if (status === 'SUBSCRIBED') {
                        console.log('Realtime connected');
                    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                        console.warn('Realtime failed, polling active');
                    }
                });
            _realtimeSubscription = channel;
        } catch (e) {
            console.warn('Realtime not available, polling active');
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // ═─ EVENT LISTENERS & INICIALIZAÇÃO ══════════════════════════════════════
    // ══════════════════════════════════════════════════════════════════════════
    // A função init() é chamada quando o DOM está pronto (DOMContentLoaded ou
    // imediatamente se já carregado). Registra todos os event listeners:
    //   - Formulário de login e botão de logout
    //   - Toggle de visibilidade da senha
    //   - Navegação por abas
    //   - Modais (fechar, cancelar, clique fora)
    //   - Botões de adicionar (barbeiro, serviço, produto, admin)
    //   - Filtros de agendamentos e pedidos
    //   - Painel de notificações
    //
    // Após registrar os listeners, chama checkSession() para verificar se
    // existe uma sessão ativa (auto-login).
    //
    // O objeto AdminApp é exposto em window para que funções possam ser
    // chamadas de atributos onclick nos templates HTML gerados dinamicamente.
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Inicializa o painel administrativo: registra todos os event listeners
     * e verifica se há sessão ativa para auto-login.
     */
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

        $('btn-notifications').addEventListener('click', function (e) {
            e.stopPropagation();
            toggleNotificationPanel();
        });
        $('notification-panel').addEventListener('click', function (e) {
            e.stopPropagation();
        });
        document.addEventListener('click', function () {
            var panel = $('notification-panel');
            if (panel && panel.style.display !== 'none') {
                panel.style.display = 'none';
            }
        });

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

    // ── API Pública ──────────────────────────────────────────────────────────
    // Objeto exposto em window.AdminApp para callbacks inline nos templates HTML.
    // As funções são referenciadas em atributos onclick dos cards e modais gerados
    // dinamicamente (ex: onclick="AdminApp.editBarber('...')").
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
        resetAdminPassword: resetAdminPassword,
        editAdminRole: editAdminRole,
        goToPage: function (p) { loadAppointments(p); }
    };

    // ── Bootstrap ────────────────────────────────────────────────────────────
    // Garante que init() seja chamado assim que o DOM estiver pronto.
    // Se o DOM ainda estiver carregando, aguarda DOMContentLoaded.
    // Caso contrário (script carregado deferidamente), executa imediatamente.
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
