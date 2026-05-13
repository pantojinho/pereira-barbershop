# AGENTS.md — Memoria e Orientacao do Sistema

> Este arquivo e a "memoria" compartilhada entre agentes de IA que trabalham neste projeto.
> **SEMPRE leia este arquivo no inicio de cada sessao.**
> **SEMPRE atualize o log no final de cada sessao.**

---

## Projeto

**Nome:** Pereira's Barber Shop — Landing Page + Sistema de Agendamento
**URL Producao:** https://pereira-barbershop.vercel.app
**URL Agendamento:** https://pereira-barbershop.vercel.app/agendar.html
**Repo:** https://github.com/ciandrini/pereira-barbershop
**Framework:** Site estatico (HTML + CSS + JS puro)
**Deploy:** Vercel (static files, sem framework, sem build)
**Servidor local:** FastAPI (`server.py`) servindo pasta `static/` na porta 8000
**Banco de Dados (futuro):** Supabase Free (PostgreSQL + Auth)
**WhatsApp (futuro):** Evolution API ou Z-API

### Proposito
Landing page tipo "cartao de visitas digital" + sistema de agendamento online para a barbearia Pereira's Barber Shop em Votorantim, SP.

### Barbeiros
- Rafael
- Gabriel
- Marcus Vinicius
- (sistema escalavel para mais barbeiros no futuro)

### Servicos e Precos
| Servico | Preco | Duracao |
|---|---|---|
| Corte (sobrancelha cortesia) | R$ 43,00 | 1h |
| Corte + Barbaterapia (sobrancelha cortesia) | R$ 75,00 | 1h20 |
| Barbaterapia (pezinho cortesia) | R$ 43,00 | 1h |
| Orelha e Nariz com cera | R$ 25,00 | 30min |
| Selagem | R$ 50,00 | 1h |

---

## Arquitetura

```
/
  index.html                    ← Landing page (raiz, usada pelo Vercel)
  style.css                     ← Estilos da landing page (raiz)
  agendar.html                  ← Pagina de agendamento (raiz)
  agendar.css                   ← Estilos do agendamento (raiz)
  agendar.js                    ← Logica do agendamento — fluxo: Barbeiro → Servico → Data/Hora → Dados
  admin.html                    ← Painel administrativo (login + CRUD)
  admin.css                     ← Estilos do painel admin
  admin.js                      ← Logica do painel admin (Supabase Client)
  supabase-config.js            ← Config Supabase (URL + anon key) — GITIGNORED
  supabase-schema.sql           ← SQL para criar tabelas (referencia)
  supabase-security-hardening.sql ← SQL para RLS + RPC + admin allow-list
  logo.png                      ← Logo oficial (raiz)
  favicon.svg                   ← Favicon (raiz)
  vercel.json                   ← Config do Vercel (framework: null, outputDirectory: ".")
  server.py                     ← Servidor local FastAPI (desenvolvimento)
  requirements.txt              ← Dependencies Python — GITIGNORED
  static/                       ← Copia para servidor local (sincronizada com raiz)
    index.html, style.css, agendar.html, agendar.css, agendar.js,
    admin.html, admin.css, admin.js, supabase-config.js, logo.png, favicon.svg
  AGENTS.md                     ← Este arquivo (memoria compartilhada)
  .gitignore
  README.md
```

### Regra importante sobre deploy no Vercel
- O Vercel serve os arquivos da **raiz do projeto** como site estatico
- `vercel.json` tem `"framework": null`, `"buildCommand": null`, `"installCommand": null`, `"outputDirectory": "."`
- `requirements.txt` esta no `.gitignore` para o Vercel NAO detectar como projeto Python
- **Nunca** coloque `requirements.txt` no git — isso faz o Vercel tentar usar Python e quebrar tudo
- O `server.py` e a pasta `static/` existem apenas para uso LOCAL com FastAPI

### Regra importante sobre sincronizacao
Quando editar HTML/CSS/logo, faca em **AMBOS** os lugares:
1. Arquivos na raiz (para Vercel)
2. Arquivos na pasta `static/` (para servidor local)

---

## Identidade Visual

- **Cores primarias:** Verde escuro `#2D4B40`, Creme `#F8F5ED`
- **Cor de destaque:** Dourado `#FFD700`
- **Fontes:** Playfair Display (titulos), Inter (corpo)
- **Estilo:** Vintage classico, cartao de visitas elegante
- **Logo:** `logo.png` (formato PNG, fundo transparente)

---

## Contatos da Barbearia

- **Endereco:** Av. Matheus Conegero, 141, Pq Bela Vista, Votorantim - SP
- **Telefone/WhatsApp:** 15 98131-1623
- **Instagram:** @barbeariapereiravotorantim
- **Horario:** Seg - Sab: 09h as 19h | Dom: Fechado
- **Desde:** 2016

---

## Historico de Problemas Conhecidos

| Problema | Causa | Solucao Aplicada |
|---|---|---|
| CSS 404 no Vercel | Vercel detectava como projeto Python via requirements.txt | Removido requirements.txt do git, arquivos na raiz |
| Logo 404 no Vercel | Caminho `/static/logo-original.jpg` com framework errado | Logo copiada para raiz como `logo.png`, caminho relativo |
| Site todo quebrado no Vercel | `@vercel/python` build interceptando requisicoes | Mudado para deploy estatico puro |

---

## Log de Sessoes

### Sessao 1 — 12/05/2026 (22:30)
**Agente:** opencode (glm-5.1)
**Tarefas realizadas:**
- Analisou projeto completo (server.py, index.html, style.css, vercel.json)
- Identificou que o Vercel detectava o projeto como Python por causa do requirements.txt
- Copiou arquivos estaticos (index.html, style.css, logo.png, favicon.svg) para a raiz do projeto
- Atualizou vercel.json para deploy estatico puro (`framework: null`, `outputDirectory: "."`)
- Adicionou requirements.txt ao .gitignore
- Corrigiu caminhos no HTML de `/static/...` para caminhos relativos
- Renomeou logo correta (logo Png.png → logo.png, sem espacos)
- Atualizou ano no footer para 2026
- Adicionou meta tags OG e theme-color
- Melhorou CSS com background-attachment fixed e transicoes

**Pendencias:**
- Verificar se o deploy no Vercel funciona apos push
- Substituir QR Code placeholder por QR Code real (link WhatsApp)
- O `server.py` local precisa da pasta `static/` sincronizada

---

### Sessao 2 — 12/05/2026 (23:00)
**Agente:** opencode (glm-5.1)
**Tarefas realizadas:**
- Diagnosticou que o Vercel servia CSS/logo em `/static/` (404) pois a config antiga usava `@vercel/python`
- Confirmou que o Vercel detectava projeto como Python por causa do `requirements.txt`
- Copiou `logo Png.png` para `logo.png` (nome sem espacos)
- Copiou `index.html`, `style.css`, `logo.png`, `favicon.svg` para a raiz do projeto
- Atualizou `vercel.json` para deploy estatico puro (`framework: null`, `outputDirectory: "."`)
- Removeu `requirements.txt` do tracking git (`git rm --cached`) e adicionou ao `.gitignore`
- Atualizou caminhos no HTML de `/static/...` para caminhos relativos
- Criou o documento `AGENTS.md` com memoria/orientacao para agentes de IA
- Fez commit e push para o GitHub
- Verificou que o site esta funcionando no Vercel (HTML, CSS, logo e favicon OK)

**Pendencias:**
- Substituir QR Code placeholder por QR Code real (link WhatsApp)
- Sincronizar pasta `static/` com arquivos da raiz para servidor local funcionar

**Notas:**
- O Vercel agora serve os arquivos da raiz do projeto como site estatico
- O `requirements.txt` existe localmente mas NAO vai para o git (esta no .gitignore)
- Para usar o servidor local: `python server.py` (serve da pasta `static/`)
- IMPORTANTE: ao editar HTML/CSS, atualizar AMBOS (raiz + static/)

---

### Sessao 3 — 12/05/2026 (23:30)
**Agente:** opencode (glm-5.1)
**Tarefas realizadas:**
- Restaurou `index.html` original (sem mexer na landing page)
- Adicionou QR Code real na landing page apontando para `agendar.html` (via API qrserver.com)
- Criou pagina exclusiva de agendamento `agendar.html` com fluxo de 4 passos:
  1. Escolher barbeiro (Rafael, Gabriel, Marcus Vinicius)
  2. Escolher data (calendario interativo) e horario disponivel
  3. Escolher servico(s) com precos e duracao (selecao multipla)
  4. Dados do cliente (nome + WhatsApp) + resumo do agendamento
- Criou `agendar.css` com design consistente com a identidade visual
- Criou `agendar.js` com toda logica: calendario, time slots, validacao, mascara de telefone, resumo, confirmacao com link WhatsApp
- Atualizou `server.py` para servir a pagina de agendamento localmente
- Sincronizou todos os arquivos com a pasta `static/`
- Atualizou `AGENTS.md` com barbeiros, servicos/precos e novo log

**Fluxo do agendamento (corrigido):**
1. Passo 1: Escolher barbeiro
2. Passo 2: Escolher data e horario
3. Passo 3: Escolher servico(s)
4. Passo 4: Nome + Telefone (WhatsApp)
5. Tela de confirmacao com link WhatsApp

**Pendencias:**
- Conectar agendamento ao Supabase (banco de dados real)
- Criar painel admin com login (Supabase Auth)
- Implementar notificacoes WhatsApp (Evolution API)
- Substituir dados estaticos por dados do banco (barbeiros, servicos, horarios)
- Gerar QR Code real apontando para pagina de agendamento

**Notas:**
- A pagina de agendamento funciona 100% frontend (sem backend ainda)
- Os dados de barbeiros/servicos estao hardcoded no `agendar.js`
- A confirmacao gera mensagem formatada para WhatsApp
- Horarios de cada barbeiro sao configuraveis no objeto `BARBERS` no `agendar.js`

---

### Sessao 4 — 13/05/2026
**Agente:** opencode (glm-5.1)
**Tarefas realizadas:**
- Criou projeto Supabase (mblmmfvibowclskdzzsf.supabase.co)
- Criou SQL schema completo: tabelas barbers, services, appointments com RLS
- Criou `supabase-config.js` com credenciais publicas (anon key)
- Criou painel administrativo completo (`admin.html`, `admin.css`, `admin.js`):
  - Login com Supabase Auth (email + senha)
  - Dashboard com estatisticas (agendamentos hoje, semana, barbeiros ativos, faturamento)
  - Gerenciamento de barbeiros (CRUD: adicionar, editar horarios, ativar/desativar, excluir)
  - Gerenciamento de servicos (CRUD: adicionar, editar preco/duracao, ativar/desativar, excluir)
  - Lista de agendamentos com filtros (barbeiro, status, data) e paginacao
  - Cancelar e concluir agendamentos
  - Link WhatsApp direto pelo painel
  - Gerenciamento de administradores (criar novos via signUp)
- Atualizou `agendar.js` para usar Supabase:
  - Barbeiros carregados do banco (ao inves de hardcoded)
  - Servicos carregados do banco (ao inves de hardcoded)
  - Verificacao de disponibilidade real (slots ja ocupados no banco)
  - Agendamentos salvos no banco ao confirmar
- Atualizou `agendar.html` para incluir Supabase JS Client
- Atualizou `server.py` para servir novos arquivos (admin.html, admin.css, admin.js, supabase-config.js)
- Atualizou `.gitignore` para proteger secrets do Supabase
- Sincronizou todos os arquivos com pasta `static/`
- Commit e push para o GitHub

**Supabase Config:**
- Project URL: https://mblmmfvibowclskdzzsf.supabase.co
- Tabelas: barbers, services, appointments
- RLS habilitado em todas as tabelas
- Admin criado: gabrielpantojinho@gmail.com (UID: 31187054-1c5d-496d-99a0-387582d50a0a)

**Arquitetura atualizada:**
```
/
  index.html          <- Landing page
  style.css           <- Estilos landing
  agendar.html        <- Pagina de agendamento (carrega dados do Supabase)
  agendar.css         <- Estilos agendamento
  agendar.js          <- Logica agendamento (Supabase Client)
  admin.html          <- Painel administrativo (login + CRUD)
  admin.css           <- Estilos painel admin
  admin.js            <- Logica painel admin (Supabase Client)
  supabase-config.js  <- Config Supabase (URL + anon key)
  supabase-schema.sql <- SQL para criar tabelas (referencia)
  logo.png, favicon.svg, vercel.json, server.py, etc.
  static/             <- Copia para servidor local
```

**Pendencias:**
- Implementar notificacoes WhatsApp (Evolution API ou Z-API)
- Chatbot WhatsApp para agendamento
- Relatorios (faturamento, clientes recorrentes)
- Sistema de avaliacao

**Notas:**
- Nao possui backend separado — tudo via Supabase JS Client direto no frontend
- A Service Role Key NAO esta no codigo (apenas anon key, que e publica)
- Para criar o primeiro admin: Supabase Dashboard > Authentication > Add User
- O schema SQL esta em `supabase-schema.sql` para referencia

---

### Sessao 5 — 13/05/2026
**Agente:** opencode (glm-5.1)
**Tarefas realizadas:**
- Analise geral do projeto completo (todos os arquivos HTML/CSS/JS)
- **Tela de Login (admin.html/css/js) — redesign completo:**
  - Logo agora em container com fundo creme e bordas arredondadas (96x96px)
  - Titulo usa Playfair Display (identidade visual da barbearia)
  - Labels com icones (envelope e cadeado)
  - Botao mostrar/esconder senha (toggle eye icon)
  - Loading state no botao "Entrar" (spinner + texto "Entrando...")
  - Autocomplete nos campos (email + current-password)
  - Botao "Entrar" com icone e min-height 50px
  - Link "Voltar ao site" com icone e touch target 44px
- **Pagina de Agendamento — melhorias UX mobile:**
  - Corrigido "Sab" para "Sáb" nos dias da semana do calendario
  - Touch targets dos dias do calendario aumentados para 40x40px minimo
  - Time slots com min-height 44px e display flex centralizado
  - Font-size dos inputs corrigido para 16px (evita zoom no iOS)
  - Loading state no botao de confirmar agendamento (spinner + "Enviando...")
  - Safe-area padding para telas com notch (env(safe-area-inset-bottom))
  - Background gradient do booking-nav melhorado (80% opacidade)
  - Stepper com min-width para evitar encolhimento
  - -webkit-tap-highlight-color: transparent no body
- **Painel Admin — melhorias UX mobile:**
  - Font-size dos inputs para 16px (evita zoom no iOS)
  - Safe-area padding no toast container e admin-content
  - Safe-area no admin-header (left/right)
  - Login card ajustado para mobile (padding, logo, titulo)
- **Landing Page — nao alterada** (conforme solicitacao do usuario)
- Sincronizou todos os arquivos com pasta `static/`

**Arquivos modificados:**
- `admin.html` — HTML do login redesenhado (logo container, toggle senha, icones)
- `admin.css` — Estilos do login redesenhados + safe-area + responsive
- `admin.js` — Toggle de senha + loading state no login
- `agendar.html` — "Sab" → "Sáb"
- `agendar.css` — Touch targets, font-size 16px, safe-area, booking-nav
- `agendar.js` — Loading state no botao confirmar
- `style.css` — Nao alterado nesta sessao (landing page mantida)
- Todos os arquivos sincronizados em `static/`

**Pendencias:**
- Implementar notificacoes WhatsApp (Evolution API ou Z-API)
- Chatbot WhatsApp para agendamento
- Relatorios (faturamento, clientes recorrentes)
- Sistema de avaliacao

---

### Sessao 6 — 13/05/2026
**Agente:** opencode (glm-5.1)
**Tarefas realizadas:**
- **Pagina de Agendamento — logo e titulo maiores no mobile:**
  - Logo aumentado de 40px para 52px (breakpoint 768px) e 46px (breakpoint 480px)
  - Titulo "Agendar Horario" aumentado de 1.1rem para 1.35rem (768px) e de 1rem para 1.2rem (480px)
- **Painel Admin — abas maiores no mobile:**
  - Padding das abas aumentado de 12px 14px para 14px 18px (breakpoint 768px)
  - Font-size das abas aumentado de 0.8rem para 0.9rem (breakpoint 768px)
- Sincronizou arquivos com pasta `static/`

**Arquivos modificados:**
- `agendar.css` — Logo e titulo maiores no mobile (768px e 480px)
- `admin.css` — Abas do nav maiores no mobile (768px)

**Pendencias:**
- Implementar notificacoes WhatsApp (Evolution API ou Z-API)
- Chatbot WhatsApp para agendamento
- Relatorios (faturamento, clientes recorrentes)
- Sistema de avaliacao

---

### Sessao 7 — 13/05/2026
**Agente:** opencode (glm-5.1)
**Tarefas realizadas:**
- **Reordenacao do fluxo de agendamento (critico):**
  - Ordem anterior: Barbeiro → Data/Hora → Servico → Dados
  - Nova ordem: Barbeiro → Servico → Data/Hora → Dados
  - Motivo: o sistema precisa saber a duracao do servico ANTES de mostrar horarios disponiveis
- **Selecao unica de servico:**
  - Antes: selecionava multiplos servicos (toggle)
  - Agora: apenas 1 servico por agendamento (radio-style)
- **Campo opcional "Observacoes":**
  - Adicionado textarea no passo 4 (Dados do Cliente)
  - Aparece no resumo, na confirmacao e na mensagem WhatsApp
  - Salvo no banco como `obs` (coluna nova na tabela appointments)
- **Correcao do bloqueio de horarios pela duracao real do servico:**
  - Antes: usava intervalos fixos de 30 min, nao respeitando a duracao do servico
  - Agora: usa overlap de ranges reais (start/end em minutos) para verificar conflitos
  - Exemplo: servico de 80min bloqueia corretamente 2h30 de agenda (09:00-10:20 bloqueia slots 09:00, 09:30, 10:00)
  - `lastSlotMin` calculado como `endMin - serviceDuration` (nao permite comecar servico que nao cabe no horario)
- **Tag "MAIS PEDIDO" configuravel:**
  - Antes: hardcoded no segundo servico (idx === 1)
  - Agora: campo `featured` (boolean) na tabela `services` do Supabase
  - Admin pode marcar qualquer servico como "MAIS PEDIDO" pelo painel
  - Badge dourado aparece no card do servico no admin
- **Schema SQL atualizado:**
  - `services`: coluna `featured BOOLEAN DEFAULT false`
  - `appointments`: coluna `obs TEXT`
  - Migration SQL incluida no `supabase-schema.sql` (comentada)
- **CSS:**
  - Estilos para textarea (`.form-group textarea`)
  - Badge featured no admin (`.badge-featured`)
  - Checkbox label para featured no admin (`.checkbox-label`)
- Sincronizou todos os arquivos com pasta `static/`

**Arquivos modificados:**
- `agendar.html` — Steps reordenados (Servico antes de Data/Hora), campo Obs, sum-obs-container
- `agendar.js` — Reescrito: ordem dos steps, selecao unica, overlap ranges, obs, featured do banco
- `agendar.css` — Estilos textarea, placeholder compartilhado
- `admin.js` — Campo featured no formulario de servico, badge no render
- `admin.css` — .badge-featured, .checkbox-label
- `supabase-schema.sql` — Colunas featured e obs, seed atualizado, migration SQL
- Todos sincronizados em `static/`

**SQL para rodar no Supabase (se ainda nao rodou):**
```sql
ALTER TABLE services ADD COLUMN IF NOT EXISTS featured BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS obs TEXT;
UPDATE services SET featured = true WHERE name = 'Corte + Barbaterapia (sobrancelha cortesia)';
```

**Pendencias:**
- Implementar notificacoes WhatsApp (Evolution API ou Z-API)
- Chatbot WhatsApp para agendamento
- Relatorios (faturamento, clientes recorrentes)
- Sistema de avaliacao

---

### Sessao 8 — 13/05/2026
**Agente:** opencode (glm-5.1)
**Tarefas realizadas:**
- **Horario de trabalho individual por barbeiro:**
  - Cada barbeiro ja tinha `schedule_start`, `schedule_end` e `work_days` na tabela `barbers`
  - O formulario de editar barbeiro no admin agora deixa claro que cada um tem seu proprio horario
  - O calendario de agendamento usa o horario do barbeiro selecionado
- **Sistema de feriados:**
  - Nova tabela `holidays` no Supabase (date, description, recurring)
  - Nova aba "Feriados" no painel admin (CRUD completo)
  - Feriados bloqueiam agendamentos no calendario
  - Feriados recorrentes se repetem todo ano (ex: Natal, Ano Novo)
  - RLS habilitado (publico le, admin gerencia)
- **Horario de funcionamento dinamico na landing page:**
  - Antes: hardcoded "Seg - Sab: 09h as 19h | Dom: Fechado"
  - Agora: carrega do Supabase, calcula horarios reais baseado nos barbeiros ativos
  - Agrupa dias com mesmo horario, mostra dias fechados
  - Fallback para texto estatico se der erro
- Sincronizou todos os arquivos com pasta `static/`

**Arquivos modificados:**
- `supabase-schema.sql` — Tabela holidays + RLS
- `admin.html` — Nova aba "Feriados"
- `admin.js` — CRUD de feriados (loadHolidays, renderHolidays, showHolidayForm, editHoliday, deleteHoliday)
- `admin.css` — .section-description
- `agendar.js` — loadHolidays(), isHoliday(), calendario verifica feriados
- `index.html` — Horario dinamico via script Supabase (id="business-hours")
- Todos sincronizados em `static/`

**SQL para rodar no Supabase:**
```sql
CREATE TABLE IF NOT EXISTS holidays (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    description TEXT,
    recurring BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read holidays" ON holidays
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage holidays" ON holidays
    FOR ALL USING (auth.role() = 'authenticated');
```

**Pendencias:**
- Implementar notificacoes WhatsApp (Evolution API ou Z-API)
- Chatbot WhatsApp para agendamento
- Relatorios (faturamento, clientes recorrentes)
- Sistema de avaliacao

---

### Sessao 9 — 13/05/2026 (noite)
**Agente:** opencode (glm-5.1)
**Tarefas realizadas:**
- Commit final de todos os arquivos pendentes (holidays, dynamic hours, dashboard barber filter, admin enhancements)
- Corrigido `supabase-security-hardening.sql`:
  - Adicionado `p_obs TEXT DEFAULT NULL` na RPC `create_public_appointment`
  - Adicionado `DROP POLICY IF EXISTS` para TODAS as policies (evita erro "policy already exists" ao re-rodar)
- Documentacao completa no AGENTS.md (sessao 7, 8 e 9)
- 4 commits pushados para main

**Commits desta sessao:**
1. `77c314d` — Document session 7: step reorder, single service, overlap scheduling, obs field, featured tag
2. `83ef155` — Add obs parameter to create_public_appointment RPC in security hardening SQL
3. `5b2c379` — Fix: add DROP POLICY IF EXISTS for all policies in security hardening SQL
4. `c38aa1d` — Add holidays system, dynamic business hours, dashboard barber filter and admin enhancements

**SQL importante — rodar no Supabase SQL Editor:**
```sql
-- Migration (se ainda nao rodou)
ALTER TABLE services ADD COLUMN IF NOT EXISTS featured BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS obs TEXT;
UPDATE services SET featured = true WHERE name = 'Corte + Barbaterapia (sobrancelha cortesia)';

-- Tabela de feriados (se ainda nao rodou)
CREATE TABLE IF NOT EXISTS holidays (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    description TEXT,
    recurring BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read holidays" ON holidays FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage holidays" ON holidays FOR ALL USING (auth.role() = 'authenticated');

-- Security hardening (rodar o arquivo supabase-security-hardening.sql completo)
-- Cria tabela admins, funcoes RPC, policies restritivas
```

**Estado atual do sistema:**
- Landing page: OK (index.html)
- Agendamento: OK (agendar.html) — fluxo Barbeiro → Servico → Data/Hora → Dados
- Painel admin: OK (admin.html) — Dashboard, Barbeiros, Servicos, Feriados, Agendamentos, Admins
- Banco: Supabase com RLS + RPC hardening + admin allow-list
- Deploy: Vercel (automatico via push na main)

**Pendencias:**
- Implementar notificacoes WhatsApp (Evolution API ou Z-API)
- Chatbot WhatsApp para agendamento
- Relatorios (faturamento, clientes recorrentes)
- Sistema de avaliacao

---

### Sessao 10 — 13/05/2026
**Agente:** opencode (glm-5.1)
**Tarefas realizadas:**
- **Refatoracao completa do sistema de horarios por barbeiro:**
  - Antes: barbeiro tinha um unico `schedule_start`, `schedule_end` e `work_days` (mesmo horario para todos os dias)
  - Agora: tabela separada `barber_schedules` com horario INDEPENDENTE por dia da semana para cada barbeiro
  - Cada barbeiro pode ter horarios diferentes: ex: Seg 09h-17h, Qua 10h-19h, Sab 08h-14h
- **Barbeiro pode trabalhar em feriados:**
  - Novo campo `works_holidays` na tabela `barbers` (boolean, default false)
  - Se `works_holidays = true`, o barbeiro NAO e bloqueado por feriados no calendario
  - Se `works_holidays = false`, feriados bloqueiam o calendario daquele barbeiro
- **Admin — formulario de barbeiro redesenhado:**
  - 7 linhas (Dom a Sab) com checkbox + horario inicio/fim por dia
  - Checkbox habilita/desabilita os inputs de horario daquele dia
  - Checkbox "Trabalha em feriados"
  - Ao salvar: deleta schedules antigos e insere novos
  - Card do barbeiro mostra horarios agrupados (ex: "Seg-Sex 09h-19h, Sab 09h-14h")
- **Agendar.js — reescrito para usar barber_schedules:**
  - BARBERS[id].schedule agora e um objeto {dayOfWeek: {start, end}}
  - Calendario verifica se o barbeiro trabalha naquele dia da semana
  - Feriados so bloqueiam se o barbeiro NAO trabalha feriados
  - Time slots usam o horario especifico do dia selecionado
- **Landing page — horario dinamico via barber_schedules:**
  - Carrega barber_schedules ao inves de schedule_start/schedule_end
  - Calcula horario de abertura/fechamento por dia baseado em todos os barbeiros
- Sincronizou todos os arquivos com pasta `static/`

**Novas tabelas SQL:**
- `barber_schedules` (id, barber_id, day_of_week, start_time, end_time) — UNIQUE(barber_id, day_of_week)
- `barbers` recebeu coluna `works_holidays BOOLEAN DEFAULT false`

**Arquitetura nova de horarios:**
```
barbers (id, name, active, sort_order, works_holidays)
  └── barber_schedules (id, barber_id, day_of_week, start_time, end_time)
```

**SQL para rodar no Supabase (migration):**
```sql
-- 1. Adicionar works_holidays
ALTER TABLE barbers ADD COLUMN IF NOT EXISTS works_holidays BOOLEAN NOT NULL DEFAULT false;

-- 2. Criar tabela barber_schedules
CREATE TABLE IF NOT EXISTS barber_schedules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barber_id UUID NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TIME NOT NULL DEFAULT '09:00',
    end_time TIME NOT NULL DEFAULT '19:00',
    UNIQUE(barber_id, day_of_week)
);
ALTER TABLE barber_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read barber schedules" ON barber_schedules FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage barber schedules" ON barber_schedules FOR ALL USING (auth.role() = 'authenticated'));

-- 3. Migrar dados antigos (schedule_start/schedule_end/work_days -> barber_schedules)
INSERT INTO barber_schedules (barber_id, day_of_week, start_time, end_time)
SELECT b.id, unnest(b.work_days) AS day, b.schedule_start, b.schedule_end
FROM barbers b
WHERE b.work_days IS NOT NULL AND array_length(b.work_days, 1) > 0
ON CONFLICT (barber_id, day_of_week) DO NOTHING;

-- 4. (Opcional) Remover colunas antigas
-- ALTER TABLE barbers DROP COLUMN IF EXISTS schedule_start;
-- ALTER TABLE barbers DROP COLUMN IF EXISTS schedule_end;
-- ALTER TABLE barbers DROP COLUMN IF EXISTS work_days;
```

**Arquivos modificados:**
- `supabase-schema.sql` — Reescrito: nova tabela barber_schedules, works_holidays, migration SQL
- `admin.js` — loadBarbers com barber_schedules, showBarberForm com 7 linhas de horario, editBarber carrega schedules
- `admin.css` — .schedule-grid, .schedule-row, .schedule-day-check estilos
- `agendar.js` — Reescrito: usa barber_schedules, works_holidays, feriados por barbeiro
- `index.html` — Horario dinamico via barber_schedules
- Todos sincronizados em `static/`

**Pendencias:**
- Implementar notificacoes WhatsApp (Evolution API ou Z-API)
- Chatbot WhatsApp para agendamento
- Relatorios (faturamento, clientes recorrentes)
- Sistema de avaliacao

---

### Sessao 11 — 13/05/2026
**Agente:** opencode (glm-5.1)
**Tarefas realizadas:**
- **Correcao: exibir campo obs no dashboard admin:**
  - Antes: o campo obs estava sendo salvo no banco (Sessao 7) mas NAO era exibido no dashboard admin
  - Agora: a obs aparece nos cards de agendamento (Dashboard e aba Agendamentos)
  - A obs e mostrada como um badge destacado com cor de aviso (warning/yellow) abaixo dos detalhes do agendamento
  - A obs aparece com icone de envelope (📧) e texto destacado para facilitar leitura
- **Implementacao:**
  - `admin.js` — Funcao `renderAppointmentsList()` modificada para verificar `a.obs` e criar elemento HTML `.appointment-obs`
  - `admin.css` — Novo estilo `.appointment-obs` com cor warning/background-light, padding, borda arredondada
  - A obs so aparece se o cliente preencheu o campo durante o agendamento
- Sincronizou `admin.js` e `admin.css` com pasta `static/`
- Commit e push para o GitHub (`4c7b26a`)

**Arquivos modificados:**
- `admin.js` — `renderAppointmentsList()` adiciona obsHtml quando a.obs existe
- `admin.css` — Novo estilo `.appointment-obs` (cor warning, destaque visual)
- `static/admin.js` — Sincronizado
- `static/admin.css` — Sincronizado

**CSS adicionado:**
```css
.appointment-obs {
    font-size: 0.8rem;
    color: var(--warning);
    background: var(--warning-light);
    padding: 4px 10px;
    border-radius: 6px;
    margin-top: 4px;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    max-width: 100%;
    word-break: break-word;
}
```

**Pendencias:**
- Implementar notificacoes WhatsApp (Evolution API ou Z-API)
- Chatbot WhatsApp para agendamento
- Relatorios (faturamento, clientes recorrentes)
- Sistema de avaliacao

---

### Sessao 12 — 13/05/2026
**Agente:** opencode (glm-5.1)
**Tarefas realizadas:**
- **Correção do botão voltar na página de agendamento:**
  - Problema: o botão voltar (.booking-nav) estava desaparecendo em alguns casos
  - Solução: mudou de `position: sticky` para `position: fixed` com `bottom: 0` e `left: 50%` + `transform: translateX(-50%)`
  - Aumentado z-index de 20 para 100 para garantir que fique acima de outros elementos
  - Aumentado a opacidade do background de 80% para 90% para melhor visibilidade
- **Verificação do favicon:**
  - Favicon.svg está correto e existe na raiz do projeto
  - Arquivo tem 402 bytes e formato SVG válido
  - Se o favicon não aparecer, pode ser cache do navegador (limpar cache ou abrir em janela anônima)
- **Verificação do schema Supabase:**
  - Tabelas do Supabase verificadas e confirmadas corretas
  - barber_schedules (id, barber_id, day_of_week, start_time, end_time)
  - holidays (id, date, description, recurring)
  - barbers (id, name, active, sort_order, works_holidays)
  - services (id, name, price, duration_min, featured, active, sort_order)
  - appointments (id, barber_id, service_ids, service_names, appointment_date, appointment_time, client_name, client_phone, obs, status, total_price, total_duration)
  - Funções RPC (get_public_booked_slots, create_public_appointment) verificadas
  - RLS e security hardening verificados
- Sincronizou arquivos modificados com pasta `static/`

**Arquivos modificados:**
- `agendar.css` — Booking-nav mudou de sticky para fixed, z-index aumentado
- `index.html` — Favicon verificado e mantido (sem mudanças necessárias)
- `static/agendar.css` — Sincronizado
- `static/index.html` — Sincronizado

**Notas importantes:**
- O botão voltar agora fica fixo na parte inferior da tela em todos os passos do agendamento
- O booking-nav não é mais afetado por elementos com position sticky (como services-summary no passo 2)
- Se o favicon não aparecer no navegador, é necessário limpar o cache ou testar em janela anônima
- O schema SQL do Supabase está correto e não há bugs nas tabelas ou funções

**Pendências:**
- Implementar notificações WhatsApp (Evolution API ou Z-API)
- Chatbot WhatsApp para agendamento
- Relatórios (faturamento, clientes recorrentes)
- Sistema de avaliação

---

### Sessao 13 — 13/05/2026
**Agente:** opencode (glm-5.1)
**Tarefas realizadas:**
- **Gerenciamento de administradores pelo painel (CRUD completo):**
  - `loadAdmins()` reescrita: agora lista todos os admins da tabela `admins` com avatar, email e badge "Ativo"
  - Mostra "(você)" ao lado do admin logado
  - Admin logado NÃO pode se auto-remover
- **Adicionar novo admin:**
  - Botão "+ Novo Admin" abre formulário com email + senha
  - Usa `sb.auth.signUp()` para criar o usuário no Supabase Auth
  - Após criar, insere automaticamente na tabela `admins` (user_id, email, active)
  - Validação: email obrigatório, senha mínimo 6 caracteres
  - Trata caso de email já cadastrado
- **Resetar senha:**
  - Botão "chave" (ícone key) ao lado de cada admin
  - Usa `sb.auth.resetPasswordForEmail()` que envia email de redefinição de senha
  - O admin recebe o email e redefine a senha sozinho
  - redirectTo aponta para admin.html
- **Remover admin:**
  - Botão "lixo" (ícone trash) ao lado de cada admin (exceto o logado)
  - Remove da tabela `admins` — o usuário continua no Supabase Auth mas perde acesso ao painel
  - Confirmação antes de remover
- **RLS atualizada para tabela admins:**
  - Adicionadas policies de INSERT e DELETE para admins autenticados
  - `Admins can insert admins` — WITH CHECK (is_current_admin())
  - `Admins can delete admins` — USING (is_current_admin())
- CSS: adicionado `.admin-card-actions` (flex, gap: 8px)
- Sincronizou arquivos com pasta `static/`

**Arquivos modificados:**
- `admin.js` — loadAdmins, showAddAdminForm, addNewAdmin, removeAdmin, resetAdminPassword
- `admin.css` — .admin-card-actions
- `supabase-security-hardening.sql` — Policies INSERT/DELETE na tabela admins
- Todos sincronizados em `static/`

**SQL para rodar no Supabase (RLS da tabela admins):**
```sql
DROP POLICY IF EXISTS "Admins can insert admins" ON public.admins;
DROP POLICY IF EXISTS "Admins can delete admins" ON public.admins;
CREATE POLICY "Admins can insert admins" ON public.admins
    FOR INSERT TO authenticated
    WITH CHECK (public.is_current_admin());
CREATE POLICY "Admins can delete admins" ON public.admins
    FOR DELETE TO authenticated
    USING (public.is_current_admin());
```

**Notas:**
- O signUp pode exigir confirmação de email dependendo da config do Supabase
- O reset de senha envia um email automático do Supabase
- O usuário `recadosrafael@gmail.com` precisa ser adicionado à tabela admins:
  ```sql
  INSERT INTO public.admins (user_id, email, active)
  VALUES ('4c0d66d6-0064-41a1-b386-d4dbba4329eb', 'recadosrafael@gmail.com', true)
  ON CONFLICT (user_id) DO UPDATE SET email = EXCLUDED.email, active = true;
  ```

**Pendências:**
- Implementar notificações WhatsApp (Evolution API ou Z-API)
- Chatbot WhatsApp para agendamento
- Relatórios (faturamento, clientes recorrentes)
- Sistema de avaliação

---

### Sessão 14 — 13/05/2026
**Agente:** opencode (glm-5.1)
**Tarefas realizadas:**
- **Correcao do formulario de horarios do barbeiro (bug critico):**
  - Problema: ao editar barbeiro, os checkboxes de dias da semana nao habilitavam/desabilitavam os campos de horario ao clicar
  - Causa: o callback `onOpen` do `showBarberForm` so definia o estado inicial dos inputs mas NAO adicionava `change` event listeners nos checkboxes
  - Solucao: criada funcao `toggleDayInputs()` que e chamada no `onOpen` e tambem vinculada ao evento `change` de cada checkbox
  - Agora ao marcar/desmarcar um dia, os campos de horario habilitam/desabilitam corretamente em tempo real
- **Remocao completa da aba Feriados:**
  - Removido tab "Feriados" do `admin.html`
  - Removida secao `tab-holidays` inteira do `admin.html`
  - Removidas todas as funcoes CRUD de feriados do `admin.js` (loadHolidays, renderHolidays, showHolidayForm, editHoliday, deleteHoliday)
  - Removido campo `works_holidays` do formulario de barbeiro e do card de barbeiro
  - Removido `loadHolidays()` de `showAdminPanel`
  - Removido event listener do botao `btn-add-holiday`
  - Removidas referencias a feriados do `AdminApp` exports
- **Remocao de feriados do agendamento (agendar.js):**
  - Removida variavel `HOLIDAYS`
  - Removida chamada `loadHolidays()` do init
  - Removidas funcoes `loadHolidays()` e `isHoliday()`
  - Removida verificacao de feriado no calendario (blockedByHoliday)
  - Removido campo `works_holidays` do objeto BARBERS
- Sincronizou todos os arquivos com pasta `static/`

**Motivo da remocao dos feriados:**
- O sistema de feriados bloqueava todos os barbeiros igualmente, mas na pratica cada barbeiro decide se trabalha ou nao em feriados dependendo da semana
- Nao e util ter uma lista fixa de feriados — cada um gerencia seus proprios horarios pela tabela `barber_schedules`

**Arquivos modificados:**
- `admin.js` — Fix checkbox toggleDayInputs + removido holidays CRUD + works_holidays
- `admin.html` — Removido tab e secao Feriados
- `agendar.js` — Removido HOLIDAYS, loadHolidays, isHoliday, works_holidays
- Todos sincronizados em `static/`

**Pendencias:**
- Implementar notificacoes WhatsApp (Evolution API ou Z-API)
- Chatbot WhatsApp para agendamento
- Relatorios (faturamento, clientes recorrentes)
- Sistema de avaliacao

---

### Sessão 15 — 13/05/2026 (noite)
**Agente:** opencode (glm-5.1)
**Tarefas realizadas:**
- **Melhoria do formulario de horarios do barbeiro para mobile (UX critica):**
  - Problema: o formulario de horarios por dia usava layout de grid (1 linha com checkbox + 3 inputs), o que era ruim no celular
  - Solucao: mudou de layout horizontal para vertical empilhado
  - Cada dia agora e um bloco independente com:
    - Checkbox do dia no topo (com font-size maior e mais spacing)
    - Inputs de horario abaixo do checkbox (empilhados horizontalmente)
  - Touch targets aumentados:
    - Checkbox: 22x22px (antes 16x16px)
    - Inputs de horario: min-height 44px (antes 36px)
    - Padding geral aumentado
  - Visual melhorado:
    - Cada dia tem fundo creme (`var(--gray-100)`) e borda
    - Border-radius aplicado em cada bloco
    - Labels mais legiveis (font-weight 600, color dark)
  - HTML reestruturado:
    - Adicionado wrapper `.time-inputs` ao redor dos inputs de horario
    - Flexbox para alinhamento dos inputs de horario
- Sincronizou arquivos com pasta `static/`
- Commit e push para o GitHub (`f786498`)

**Arquivos modificados:**
- `admin.css` — CSS reescrito para `.schedule-grid`, `.schedule-row`, `.schedule-day-check`, `.time-inputs`
- `admin.js` — HTML gerado pela `showBarberForm` atualizado com wrapper `.time-inputs`
- `static/admin.css` — Sincronizado
- `static/admin.js` — Sincronizado

**Notas importantes:**
- O formulario agora funciona muito melhor no celular com touch targets maiores e layout vertical
- Cada dia e claramente separado visualmente, facilitando a navegacao
- A estrutura CSS e flexivel e funciona bem em todos os tamanhos de tela

**Pendencias:**
- Implementar notificacoes WhatsApp (Evolution API ou Z-API)
- Chatbot WhatsApp para agendamento
- Relatorios (faturamento, clientes recorrentes)
- Sistema de avaliacao

---

### Sessão 16 — 13/05/2026
**Agente:** opencode (glm-4.7)
**Tarefas realizadas:**
- **Modal de detalhes do agendamento com UX aprimorada:**
  - Cards de agendamento agora sao clicaveis para abrir modal de detalhes completos
  - Botões de ação direta (concluir, cancelar, WhatsApp) removidos da lista para evitar ações acidentais
  - Modal exibe todas as informações: cliente, telefone, barbeiro, serviço(s), data, hora, total, observações
  - Status badge grande e colorido no topo do modal
- **Links do WhatsApp no modal:**
  - Botão "WhatsApp" abre conversa normal com mensagem personalizada
  - Ao cancelar agendamento, exibe alerta para notificar cliente primeiro
  - Link pré-formatado para notificação de cancelamento com todos os detalhes (serviço, data, hora, barbeiro, link para reagendar)
- **Ações contextuais por status:**
  - Pendente: botão "Confirmar"
  - Confirmado/Pendente: botão "Concluir" e botão "Cancelar"
  - Cancelado/Concluído: botão "Remover do Histórico"
  - Todos têm botão "Fechar"
- **Fluxo de cancelamento aprimorado:**
  - Ao clicar em "Cancelar", exibe aviso em destaque com fundo vermelho claro
  - Botão "Notificar Cliente (WhatsApp)" abre WhatsApp com mensagem de cancelamento pronta
  - Botão "Confirmar Cancelamento" só deve ser clicado APÓS notificar cliente
  - Botão "Voltar" para voltar ao modal de detalhes caso mude de ideia
- **UX melhorias:**
  - Lista de agendamentos mais limpa e organizada
  - Redução de clicar botões errados por acidente
  - Mais contexto antes de tomar decisões importantes
  - Telefone exibido na lista de agendamentos (mobile-friendly)
- Sincronizou arquivos com pasta `static/`
- Commit e push para o GitHub (`eaa60c0`)

**Arquivos modificados:**
- `admin.js` — showAppointmentDetails, closeAppointmentDetails, confirmAppointment, cancelAppointmentFromDetails, confirmCancel, deleteAppointment, getWhatsAppLink, getWhatsAppCancelLink; renderAppointmentsList atualizado com onclick no card; completeAppointment refatorada
- `static/admin.js` — Sincronizado

**Notas importantes:**
- O modal de detalhes fornece todas as informações em um só lugar, facilitando decisões
- O fluxo de cancelamento exige que o admin notifique o cliente antes de confirmar, reduzindo problemas de comunicação
- Links do WhatsApp são pré-formatados com mensagens personalizadas
- A lista de agendamentos fica mais limpa sem múltiplos botões em cada card

**Pendencias:**
- Implementar notificacoes WhatsApp (Evolution API ou Z-API)
- Chatbot WhatsApp para agendamento
- Relatorios (faturamento, clientes recorrentes)
- Sistema de avaliacao

---

### Plano do Sistema Completo (Roadmap)

#### Fase 1 — Concluida
- [x] Landing page funcional no Vercel
- [x] QR Code real na landing page
- [x] Pagina de agendamento (frontend)

#### Fase 2 — Concluida
- [x] Configurar Supabase (PostgreSQL + Auth)
- [x] Criar tabelas: barbers, services, appointments
- [x] Supabase JS Client direto no frontend (sem backend separado)
- [x] Substituir dados estaticos por chamadas ao Supabase
- [x] Salvar agendamentos no banco de dados
- [x] Verificar disponibilidade real de horarios

#### Fase 3 — Concluida
- [x] Tela de login (Supabase Auth) — admin.html
- [x] Dashboard com agenda do dia e estatisticas
- [x] Gerenciar barbeiros (CRUD completo)
- [x] Gerenciar servicos (CRUD completo)
- [x] Gerenciar administradores (criar novos)
- [x] Historico de agendamentos com filtros
- [x] Cancelar e concluir agendamentos
- [x] Link WhatsApp direto pelo painel

#### Fase 4 — WhatsApp (Futuro)
- [ ] Configurar Evolution API (self-hosted) ou Z-API
- [ ] Notificacao de confirmacao para cliente
- [ ] Notificacao de novo agendamento para dono
- [ ] Lembrete 1h antes do horario

#### Fase 5 — Melhorias (Futuro)
- [ ] Chatbot WhatsApp para agendamento
- [ ] Relatorios (faturamento, clientes recorrentes)
- [ ] Sistema de avaliacao
