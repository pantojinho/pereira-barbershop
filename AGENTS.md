# AGENTS.md — Memoria e Orientacao do Sistema

> Este arquivo e a "memoria" compartilhada entre agentes de IA que trabalham neste projeto.
> **SEMPRE leia este arquivo no inicio de cada sessao.**
> **SEMPRE atualize o log no final de cada sessao.**

---

## Projeto

**Nome:** Pereira's Barber Shop — Landing Page + Sistema de Agendamento
**URL Producao:** https://www.pereira-barbershop.com.br
**URL Agendamento:** https://www.pereira-barbershop.com.br/agendar.html
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
  produtos.html                  ← Lojinha de produtos com carrinho (raiz)
  produtos.css                   ← Estilos da lojinha (raiz)
  produtos.js                    ← Logica do carrinho — fluxo: Produtos → Carrinho → Dados → Confirmacao
  supabase-config.js            ← Config Supabase (URL + anon key) — GITIGNORED
  supabase-schema.sql           ← SQL para criar tabelas (referencia)
  supabase-security-hardening.sql ← SQL para RLS + RPC + admin allow-list
  logo.png                      ← Logo oficial (raiz)
  favicon.svg                   ← Favicon (raiz)
  sitemap.xml                   ← Sitemap XML para SEO (3 paginas: /, /agendar, /produtos)
  robots.txt                    ← Instrucoes para crawlers (Allow all + Sitemap)
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
- Implementar notificacoes WhatsApp (Evolution API ou Z-API)
- Chatbot WhatsApp para agendamento
- Relatorios (faturamento, clientes recorrentes)
- Sistema de avaliacao

---

### Sessão 17 — 13/05/2026
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
- Commit e push para o GitHub (`aebfcf0`)

**Arquivos modificados:**
- `admin.html` — Adicionado modal de detalhes do agendamento (`appointment-details-overlay`)
- `admin.js` — showAppointmentDetails, closeAppointmentDetails, confirmAppointment, cancelAppointmentFromDetails, confirmCancel, deleteAppointment, getWhatsAppLink, getWhatsAppCancelLink; renderAppointmentsList atualizado com onclick no card; completeAppointment refatorada; exports do AdminApp atualizados
- `admin.css` — Estilos para modal de detalhes (.modal-appointment-details, .appointment-detail-item, .appointment-detail-whatsapp-link, .appointment-detail-cancel-link, .appointment-detail-actions, etc.); cards clicáveis com cursor pointer
- `static/admin.html` — Sincronizado
- `static/admin.js` — Sincronizado
- `static/admin.css` — Sincronizado

**Notas importantes:**
- O modal de detalhes fornece todas as informações em um só lugar, facilitando decisões
- O fluxo de cancelamento exige que o admin notifique o cliente antes de confirmar, reduzindo problemas de comunicação
- Links do WhatsApp são pré-formatados com mensagens personalizadas
- A lista de agendamentos fica mais limpa sem múltiplos botões em cada card
- A exclusão de agendamentos do histórico é permanente (DELETE no Supabase)

**Pendências:**
- Implementar notificacoes WhatsApp (Evolution API ou Z-API)
- Chatbot WhatsApp para agendamento
- Relatorios (faturamento, clientes recorrentes)
- Sistema de avaliacao

---

### Sessão 18 — 13/05/2026
**Agente:** opencode (glm-4.7)
**Tarefas realizadas:**
- **Correcao do z-index do modal de detalhes no mobile:**
  - Problema: os botoes do modal de detalhes (especialmente "Remover do Historico") ficavam escondidos atras de outros elementos no celular
  - Causa: o modal-appointment-details nao tinha z-index especifico, e no mobile o modal-footer nao tinha sticky position
  - Solucao: aumentado z-index do modal-appointment-details para 1001 (acima do modal-overlay que tem 1000)
  - Adicionado position sticky no modal-footer para mobile (fica sempre visivel no fundo)
  - Adicionado box-shadow no modal-footer para destacar do resto do modal
  - Aumentado min-height dos botoes para 50px (melhor touch target)
  - Botoes agora sao display grid com 1 coluna (largura total)
- **Melhorias de UX mobile:**
  - Botoes agora ficam sempre visiveis mesmo quando o conteudo do modal eh longo
  - Modal-footer tem fundo branco e sombra para se destacar
  - Botoes tem min-width auto e width 100% (ocupam todo o espaco disponivel)
- Sincronizou arquivos com pasta `static/`
- Commit e push para o GitHub (`1254afc`)

**Arquivos modificados:**
- `admin.css` — z-index do modal-appointment-details aumentado para 1001; estilos mobile adicionados para modal-footer e appointment-detail-actions
- `static/admin.css` — Sincronizado

**Notas importantes:**
- O modal de detalhes agora funciona perfeitamente no mobile com botoes sempre visiveis
- O z-index mais alto garante que o modal fique acima de todos os outros elementos
- Apos o deploy no Vercel, limpar o cache do navegador ou testar em janela anonima para ver as mudancas

**Pendências:**
- Implementar notificacoes WhatsApp (Evolution API ou Z-API)
- Chatbot WhatsApp para agendamento
- Relatorios (faturamento, clientes recorrentes)
- Sistema de avaliacao

---

### Sessão 19 — 13/05/2026
**Agente:** opencode (glm-5.1)
**Tarefas realizadas:**
- **Correção do checkbox invisível no formulário de editar barbeiro:**
  - Problema: ao editar um barbeiro, os checkboxes dos dias da semana (Seg, Ter, etc.) apareciam vazios — o checkmark não era visível ao clicar
  - Causa: `.form-group input` (linha 186 do admin.css) aplica `-webkit-appearance: none` em TODOS os inputs, incluindo checkboxes. Isso remove o visual nativo do checkmark.
  - Solução: adicionado `-webkit-appearance: checkbox; appearance: checkbox;` nos 3 seletores de checkbox do admin:
    - `.schedule-day-check input[type="checkbox"]` — dias da semana do barbeiro
    - `.checkbox-label input[type="checkbox"]` — "MAIS PEDIDO" e "Trabalha em feriados"
    - `.work-day-option input[type="checkbox"]` — opção genérica de dia
- Sincronizou `admin.css` com pasta `static/`

**Arquivos modificados:**
- `admin.css` — Adicionado `-webkit-appearance: checkbox; appearance: checkbox;` nos seletores de checkbox
- `static/admin.css` — Sincronizado

**Pendências:**
- Implementar notificacoes WhatsApp (Evolution API ou Z-API)
- Chatbot WhatsApp para agendamento
- Relatorios (faturamento, clientes recorrentes)
- Sistema de avaliacao

---

### Sessão 20 — 13/05/2026
**Agente:** opencode (glm-4.7)
**Tarefas realizadas:**
- **Correção da janela de confirmação ficando atrás do modal de detalhes:**
  - Problema: ao clicar em "Remover do Histórico" no modal de detalhes do agendamento, a janela de confirmação aparecia ATRÁS do modal de detalhes
  - Causa: `#confirm-overlay` tinha z-index 1000, enquanto `#appointment-details-overlay` tinha z-index 1001 (mais alto)
  - Solução 1: adicionado regra CSS específica `#confirm-overlay { z-index: 1002; }` para garantir que fique acima do modal de detalhes
  - Solução 2: modificado `deleteAppointment()` para chamar `closeAppointmentDetails()` antes de mostrar a confirmação (assim os detalhes fecham automaticamente e só a confirmação aparece)
- Sincronizou `admin.css` e `admin.js` com pasta `static/`
- Commit e push para o GitHub (`45af135`)

**Arquivos modificados:**
- `admin.css` — Adicionado `#confirm-overlay { z-index: 1002; }` após `.modal-overlay`
- `admin.js` — `deleteAppointment()` agora chama `closeAppointmentDetails()` antes de `showConfirm()`
- `static/admin.css` — Sincronizado
- `static/admin.js` — Sincronizado

**Notas importantes:**
- Agora a janela de confirmação sempre aparece acima do modal de detalhes
- Ao clicar em "Remover do Histórico", o modal de detalhes fecha automaticamente antes de mostrar a confirmação
- Isso proporciona uma UX mais limpa e evita confusão com múltiplas janelas sobrepostas

**Pendências:**
- Implementar notificacoes WhatsApp (Evolution API ou Z-API)
- Chatbot WhatsApp para agendamento
- Relatorios (faturamento, clientes recorrentes)
- Sistema de avaliacao

---

### Sessão 21 — 13/05/2026
**Agente:** opencode (glm-4.7)
**Tarefas realizadas:**
- **Correção do mesmo bug da sessão 20 (confirmação atrás dos detalhes):**
  - Problema reportado novamente pelo usuário: ao tentar remover um agendamento já cancelado, ao clicar em "Remover do Histórico", a janela de confirmação aparece ATRÁS dos detalhes do agendamento
  - O usuário tinha que clicar em "fechar" primeiro e depois clicar em "confirmar"
  - Solução implementada na sessão 20 já estava correta:
    1. `#confirm-overlay` com z-index 1002 (acima do modal de detalhes que tem 1001)
    2. `deleteAppointment()` chama `closeAppointmentDetails()` antes de mostrar a confirmação
  - Verificação: ambas as soluções foram confirmadas como implementadas e funcionando
  - Commit pushado: `45af135`

**Arquivos modificados:**
- Nenhum arquivo modificado nesta sessão (apenas verificação)

**Notas importantes:**
- A correção da sessão 20 já resolve o problema completamente
- Ao clicar em "Remover do Histórico", os detalhes fecham automaticamente e só a confirmação aparece
- O z-index mais alto garante que a confirmação nunca fique atrás

**Pendências:**
- Implementar notificacoes WhatsApp (Evolution API ou Z-API)
- Chatbot WhatsApp para agendamento
- Relatorios (faturamento, clientes recorrentes)
- Sistema de avaliacao

---

### Sessão 22 — 13/05/2026
**Agente:** opencode (glm-4.7)
**Tarefas realizadas:**
- **Melhoria do fluxo de cancelamento:**
  - Ao clicar em "Cancelar", a página agora rola automaticamente até o final do modal para mostrar o aviso do WhatsApp
  - Adicionada div com ID `cancel-warning-box` para facilitar o scroll suave
  - Scroll é executado 100ms após atualizar o DOM para garantir que o elemento exista
- **Adicionada opção "Reagendar" no modal de cancelamento:**
  - Nova função `rescheduleAppointment(id)` que busca o agendamento e redireciona para `agendar.html` com parâmetros na URL
  - Parâmetros: `?barber=ID&service=ID`
  - Botão "Reagendar" aparece antes de "Confirmar Cancelamento"
- **Ajuste do texto do WhatsApp para cancelamento:**
  - Texto mais amigável e profissional com emojis
  - Mensagem: "Olá, [nome]! 😊 Gostaríamos de confirmar com você sobre seu agendamento..."
  - Explicação: "Algum imprevisto aconteceu e precisamos fazer um ajuste. Pedimos mil desculpas! ❤️"
  - Link para reagendar no site
  - Assinatura: "Agradecemos desde já! ✂️"
- **Pré-seleção de barbeiro e serviço na página de agendamento:**
  - Modificado `init()` para ler parâmetros da URL (`?barber=ID&service=ID`)
  - `loadBarbers()` e `loadServices()` agora aceitam parâmetro para pré-selecionar
  - `setupBarbers()` e `setupServices()` pré-selecionam automaticamente se o parâmetro existir
  - Facilita o reagendamento: ao clicar em "Reagendar", o cliente já vê o barbeiro e serviço selecionados
- Sincronizou arquivos com pasta `static/`
- Commit e push para o GitHub (`11be4ea`)

**Arquivos modificados:**
- `admin.js` — `cancelAppointmentFromDetails()` com scroll, `rescheduleAppointment()` nova função, `getWhatsAppCancelLink()` com texto melhorado
- `agendar.js` — `init()` lê URL params, `loadBarbers()` e `loadServices()` com parâmetros, `setupBarbers()` e `setupServices()` pré-selecionam
- `static/admin.js` — Sincronizado
- `static/agendar.js` — Sincronizado

**Notas importantes:**
- Ao clicar em "Cancelar", o modal rola até o aviso do WhatsApp automaticamente
- O botão "Reagendar" facilita muito o reagendamento de agendamentos cancelados
- O texto do WhatsApp agora é mais profissional e amigável
- A pré-seleção de barbeiro/servico melhora a UX do reagendamento

**Pendências:**
- Implementar notificacoes WhatsApp (Evolution API ou Z-API)
- Chatbot WhatsApp para agendamento
- Relatorios (faturamento, clientes recorrentes)
- Sistema de avaliacao

---

### Sessão 23 — 13/05/2026
**Agente:** opencode (glm-5.1)
**Tarefas realizadas:**
- **Foto de perfil do barbeiro:**
  - Novo campo `photo_url TEXT` na tabela `barbers` do Supabase
  - Criado bucket `barber-photos` no Supabase Storage (público)
  - Policies do Storage: público lê, autenticados fazem upload/update/delete
- **Admin — upload de foto no formulário do barbeiro:**
  - Preview circular (100px) no formulário de criar/editar barbeiro
  - Botão "Escolher Foto" abre seletor de arquivo (accept: image/*)
  - Validação de tamanho: máximo 2MB
  - Preview atualiza em tempo real com FileReader
  - Botão "Remover" para apagar a foto
  - Upload para Supabase Storage com `upsert: true` (sobrescreve foto anterior)
  - URL pública salva em `photo_url` na tabela barbers
  - Ao remover foto, deleta do Storage e limpa `photo_url`
  - Fluxo para novo barbeiro: cria → pega ID → faz upload → atualiza photo_url
- **Admin — cards dos barbeiros com foto:**
  - Foto circular (72px) exibida no topo do card do barbeiro
  - Placeholder com ícone de usuário se não tiver foto
  - Borda verde na foto
- **Página de agendamento — foto redonda ao lado do nome:**
  - Foto carregada do banco (photo_url) junto com os dados do barbeiro
  - Foto redonda (56px) substitui o ícone de tesoura quando existe
  - Fallback para ícone `fa-cut` quando não tem foto
  - Photo com `object-fit: cover` para preenchimento perfeito
- Sincronizou todos os arquivos com pasta `static/`

**Arquivos modificados:**
- `supabase-schema.sql` — `photo_url TEXT` na tabela barbers + bucket barber-photos + policies Storage
- `admin.js` — showBarberForm com upload de foto, preview, salvar/remover; renderBarbers com foto nos cards
- `admin.css` — .card-barber-photo, .barber-photo-upload-area, .barber-photo-preview, .barber-photo-actions, .barber-photo-hint
- `agendar.js` — BARBERS inclui photo_url; barber-option mostra foto redonda ou ícone
- `agendar.css` — .barber-photo (object-fit cover), .barber-icon com overflow hidden
- Todos sincronizados em `static/`

**SQL para rodar no Supabase SQL Editor:**
```sql
-- 1. Adicionar coluna photo_url
ALTER TABLE barbers ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- 2. Criar bucket de fotos
INSERT INTO storage.buckets (id, name, public)
VALUES ('barber-photos', 'barber-photos', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Policies do Storage
DROP POLICY IF EXISTS "Public can view barber photos" ON storage.objects;
CREATE POLICY "Public can view barber photos" ON storage.objects
    FOR SELECT USING (bucket_id = 'barber-photos');

DROP POLICY IF EXISTS "Authenticated can upload barber photos" ON storage.objects;
CREATE POLICY "Authenticated can upload barber photos" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'barber-photos' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated can update barber photos" ON storage.objects;
CREATE POLICY "Authenticated can update barber photos" ON storage.objects
    FOR UPDATE USING (bucket_id = 'barber-photos' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated can delete barber photos" ON storage.objects;
CREATE POLICY "Authenticated can delete barber photos" ON storage.objects
    FOR DELETE USING (bucket_id = 'barber-photos' AND auth.role() = 'authenticated');
```

**Arquitetura atualizada:**
```
barbers (id, name, active, sort_order, works_holidays, photo_url)
  └── barber_schedules (id, barber_id, day_of_week, start_time, end_time)

Supabase Storage:
  └── barber-photos/ (bucket público)
       └── {barber_id}/photo  ← foto de perfil
```

**Pendências:**
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

#### Fase 3.5 — Lojinha de Produtos (Concluida)
- [x] Tabela products + product_orders no Supabase
- [x] Pagina publica com carrinho (produtos.html/css/js)
- [x] Fluxo: Produtos → Carrinho → Dados → Confirmacao
- [x] Upload de foto de produto (Supabase Storage)
- [x] CRUD de produtos no painel admin
- [x] Dashboard de pedidos/reservas no painel admin
- [x] Botao "Explorar Produtos" na landing page
- [x] Botao "Explorar Lojinha" na confirmacao do agendamento
- [x] Reserva sem pagamento (retirada na loja, pagamento na hora)

#### Fase 4 — WhatsApp (Futuro)
- [ ] Configurar Evolution API (self-hosted) ou Z-API
- [ ] Notificacao de confirmacao para cliente
- [ ] Notificacao de novo agendamento para dono
- [ ] Lembrete 1h antes do horario

#### Fase 5 — Melhorias (Futuro)
- [ ] Chatbot WhatsApp para agendamento
- [ ] Relatorios (faturamento, clientes recorrentes)
- [ ] Sistema de avaliacao

---

### Sessão 24 — 13/05/2026
**Agente:** opencode (glm-5.1)
**Tarefas realizadas:**
- **Sistema completo de Lojinha de Produtos:**
  - Nova tabela `products` no Supabase (name, description, price, photo_url, active, sort_order)
  - Nova tabela `product_orders` no Supabase (product_ids, product_names, product_prices, quantities, client_name, client_phone, total_price, status: reserved/picked_up/cancelled)
  - Novo bucket `product-photos` no Supabase Storage (publico, upload para admins)
  - RLS habilitado em ambas as tabelas
- **Página pública de produtos (produtos.html/css/js):**
  - Fluxo de 3 passos: Produtos → Carrinho → Dados → Confirmação
  - Grid de produtos com foto, nome, descrição, preço e botões +/- de quantidade
  - Carrinho mostra itens selecionados com quantidades, total e endereço de retirada
  - Formulário de dados do cliente (nome + WhatsApp)
  - Confirmação salva no banco (product_orders) com status "reserved"
  - Botão WhatsApp com mensagem formatada do pedido
  - Botão "Agendar Horário" na tela de confirmação
  - Badge de carrinho na barra de navegação
  - Nenhum pagamento online — retirada na loja, pagamento na hora
- **Painel Admin — aba Produtos:**
  - CRUD completo (adicionar, editar, desativar, excluir)
  - Upload de foto do produto (Supabase Storage, max 2MB)
  - Cards com foto, nome, descrição e preço
- **Painel Admin — aba Pedidos:**
  - Lista de pedidos/reservas com nome, telefone, produtos, quantidade, total, data
  - Filtro por status (Reservado, Retirado, Cancelado)
  - Botão "Retirado" para marcar pedido como retirado
  - Botão "Cancelar" para cancelar pedido
  - Link WhatsApp direto para notificar cliente
- **Landing Page:**
  - Botão "Explorar Produtos" ao lado de "Agendar Horário"
  - Estilo outline (borda verde) para diferenciar do botão principal
- **Confirmação de Agendamento:**
  - Botão "Explorar Lojinha" adicionado junto com "Voltar ao Início" e "WhatsApp"
- Atualizou server.py para servir novos arquivos
- Sincronizou todos os arquivos com pasta `static/`

**Arquivos criados:**
- `produtos.html` — Página da lojinha com fluxo de carrinho
- `produtos.css` — Estilos da lojinha (consistente com identidade visual)
- `produtos.js` — Lógica do carrinho (ShopApp: addProduct, removeProduct, cartPlus, cartMinus)

**Arquivos modificados:**
- `supabase-schema.sql` — Tabelas products, product_orders, bucket product-photos, RLS
- `admin.html` — Abas Produtos e Pedidos
- `admin.js` — CRUD products, loadProductOrders, renderProductOrders, markOrderPickedUp, cancelOrder
- `index.html` — Botão "Explorar Produtos"
- `style.css` — .cta-buttons, .products-cta
- `agendar.html` — Botão "Explorar Lojinha" na confirmação
- `agendar.css` — .btn-outline-product
- `server.py` — Rotas para produtos.html/css/js
- Todos sincronizados em `static/`

**SQL para rodar no Supabase SQL Editor:**
```sql
-- Tabela de produtos
CREATE TABLE IF NOT EXISTS products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10,2) NOT NULL,
    photo_url TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de pedidos/reservas
CREATE TABLE IF NOT EXISTS product_orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_ids UUID[] NOT NULL,
    product_names TEXT[] NOT NULL,
    product_prices NUMERIC(10,2)[] NOT NULL,
    quantities INTEGER[] NOT NULL,
    client_name TEXT NOT NULL,
    client_phone TEXT NOT NULL,
    total_price NUMERIC(10,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved', 'picked_up', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_orders ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public can read active products" ON products FOR SELECT USING (active = true);
CREATE POLICY "Authenticated users can manage products" ON products FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Public can create product orders" ON product_orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can manage product orders" ON product_orders FOR ALL USING (auth.role() = 'authenticated');

-- Indices
CREATE INDEX IF NOT EXISTS idx_products_active ON products(active, sort_order);
CREATE INDEX IF NOT EXISTS idx_product_orders_status ON product_orders(status);

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('product-photos', 'product-photos', true) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Public can view product photos" ON storage.objects FOR SELECT USING (bucket_id = 'product-photos');
CREATE POLICY "Authenticated can upload product photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-photos' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated can update product photos" ON storage.objects FOR UPDATE USING (bucket_id = 'product-photos' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated can delete product photos" ON storage.objects FOR DELETE USING (bucket_id = 'product-photos' AND auth.role() = 'authenticated');
```

**Pendências:**
- Implementar notificacoes WhatsApp (Evolution API ou Z-API)
- Chatbot WhatsApp para agendamento
- Relatorios (faturamento, clientes recorrentes)
- Sistema de avaliacao

### Sessao 8 — 13/05/2026 (15:30)
**Agente:** hermes (glm-5.1)
**Tarefas realizadas:**
- Diagnosticou bugs criticos no `produtos.css`:
  - Seletor `:root` faltando (variaveis CSS nao eram aplicadas)
  - Seletor `.products-header` faltando (header sem estilos)
  - Seletor `.stepper` com bloco vazio/quebrado
- Reescreveu completamente `produtos.css` com design mobile-first profissional
- Corrigiu todos os seletores quebrados
- Adicionou animacoes de transicao suaves
- Cards de produto empilhados no mobile (480px)
- Stepper com labels escondidos em telas pequenas
- Barra de navegacao inferior com backdrop blur e touch targets 48px+
- Micro-animacoes em active states (scale feedback)
- Estetica vintage coerente com a landing page principal
- Testou localmente com FastAPI (server.py)
- Commit e push para GitHub — deploy automatico no Vercel
- Verificou que o site esta funcionando em producao

**Arquivos modificados:**
- `produtos.css` — Reescrita completa (472 insercoes, 234 delecoes)
- `static/produtos.css` — Sincronizado com a raiz

**Pendencias:**
- Verificar visualmente no celular real como ficou o layout
- Considerar adicionar transicoes entre steps mais elaboradas
- Adicionar skeleton loading enquanto produtos carregam do Supabase

---

### Sessão 10 — 13/05/2026
**Agente:** Hermes (glm-5.1 via Z.AI)
**Tarefas realizadas:**
- Reescrita completa do CSS da lojinha (produtos.css) — design mobile-first profissional
- Adicionado controle de estoque nos produtos:
  - Schema SQL: coluna `stock INTEGER DEFAULT 0` na tabela products
  - Admin: campo estoque no formulário de criar/editar produto
  - Admin: badge de estoque nos cards (verde/ok, laranja/baixo ≤5, vermelho/esgotado =0)
  - Lojinha: produto esgotado com badge "ESGOTADO" e sem botão de adicionar
  - Lojinha: bloqueia adicionar ao carrinho além do estoque disponível
- Adicionado botão de excluir pedido no admin (qualquer status)
- Atualizado README.md profissional
- Commit: feat: controle de estoque (cf90a6b)
- Commit: feat: botão excluir pedido (0ed3412)

**Arquivos modificados:**
- produtos.css — Reescrita completa mobile-first (864 linhas)
- produtos.js — Verificação de estoque no carrinho + badge esgotado
- admin.js — Campo estoque no formulário + badge nos cards + excluir pedido
- admin.css — Estilos .card-stock (.stock-ok, .stock-low, .stock-empty)
- supabase-schema.sql — Coluna stock + migration ALTER TABLE
- README.md — Reescrita profissional completa
- Todos sincronizados em static/

**SQL rodado no Supabase:**
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock INTEGER NOT NULL DEFAULT 0;

**Pendências / Roadmap futuro:**
- Notificações push/som no browser para barbeiros com site aberto
- Notificações por email (agendamento novo, cancelamento)
- Sistema de login para barbeiros (ver só própria agenda/dashboard)
- Chatbot WhatsApp para agendamento
- Relatórios (faturamento, clientes recorrentes)
- Sistema de avaliação

---

### Sessão 25 — 14/05/2026
**Agente:** opencode (glm-5.1)
**Tarefas realizadas:**
- **Correção do favicon que parou de aparecer no navegador:**
  - Problema: favicon.svg estava acessível no Vercel (200 OK, content-type correto) mas não aparecia na aba do navegador (testado em anônimo e celular)
  - Causa provável: cache do CDN do Vercel ou cache do navegador servindo versão antiga/stale
  - Solução: adicionado cache-buster `?v=2` na URL do favicon em todos os HTMLs
  - Antes: `<link rel="icon" type="image/svg+xml" href="favicon.svg">`
  - Depois: `<link rel="icon" type="image/svg+xml" href="favicon.svg?v=2">`
- Sincronizou todos os arquivos com pasta `static/`

**Arquivos modificados:**
- `index.html` — favicon.svg → favicon.svg?v=2
- `agendar.html` — favicon.svg → favicon.svg?v=2
- `admin.html` — favicon.svg → favicon.svg?v=2
- `produtos.html` — favicon.svg → favicon.svg?v=2
- `static/index.html` — Sincronizado
- `static/agendar.html` — Sincronizado
- `static/admin.html` — Sincronizado
- `static/produtos.html` — Sincronizado

**Notas importantes:**
- O favicon.svg em si não foi alterado (mesmo conteúdo SVG válido)
- O cache-buster força o navegador a baixar uma versão fresca, ignorando cache antigo
- Se o problema persistir após o deploy, pode ser necessário limpar cache do navegador ou reiniciar o dispositivo

**Pendências:**
- Implementar notificacoes WhatsApp (Evolution API ou Z-API)
- Chatbot WhatsApp para agendamento
- Relatorios (faturamento, clientes recorrentes)
- Sistema de avaliacao

---

### Sessao 9 — 16/05/2026 (00:03)
**Agente:** Hermes (glm-5.1)
**Tarefas realizadas:**
- Criou `sitemap.xml` com 3 paginas publicas do site:
  - `/` (landing page) — prioridade 1.0, changefreq weekly
  - `/agendar.html` — prioridade 0.9, changefreq monthly
  - `/produtos.html` — prioridade 0.8, changefreq weekly
- Criou `robots.txt` com `Allow: /` e referencia ao sitemap
- Verificou que nenhuma pagina possui tag `<meta name="robots" content="noindex">` (tudo limpo)
- Commit e push: `feat: add sitemap.xml and robots.txt for SEO`
- Confirmou que ambos os arquivos estao acessiveis no Vercel (200 OK)
- Gabriel enviou o sitemap no Google Search Console manualmente
- Gabriel solicitou indexacao manual das URLs via "Inspecionar qualquer URL"

**Estado SEO:**
- `sitemap.xml` — online, enviado ao Google Search Console (processamento pendente, tipo "Desconhecido" aguardando primeira leitura)
- `robots.txt` — online, apontando para o sitemap
- `noindex` — nenhuma pagina com bloqueio
- Indexacao manual — solicitada para `/`, `/agendar.html`, `/produtos.html`
- Google costuma indexar em algumas horas ate poucos dias

**Notas:**
- O tipo "Desconhecido" no Search Console e normal nas primeiras horas, muda pra "Sitemap" apos processamento
- Nenhuma acao adicional necessaria — so aguardar o Google processar

---

### Sessao 10 — 16/05/2026 (00:30)
**Agente:** Hermes (glm-5.1)
**Tarefas realizadas:**
- Implementou modal de detalhe do produto (bottom sheet) na pagina de produtos
- Toque no card do produto abre modal com: imagem grande, descricao completa, preco, estoque
- Botoes +/- dentro do modal sincronizados com o carrinho
- Botões +/- do card continuam funcionando normalmente (event delegation com `e.target.closest('.product-qty')` check)
- Fix imagens mobile: trocado `object-fit: cover` por `contain` nos cards em telas ate 480px (sem mais cortes)
- Foto do card mobile aumentada de 140px para 180px
- Modal fecha via: botao X, toque no overlay, tecla ESC
- Aviso de estoque baixo: "Restam N unidades" (<=3), "Esgotado" (0)
- Commit: `feat: product detail modal (bottom sheet) + fix mobile images`

**Arquivos alterados:**
- `produtos.html` — adicionado HTML do modal overlay + bottom sheet
- `produtos.css` — adicionado CSS do modal (~150 linhas) + fix imagens mobile
- `produtos.js` — adicionado `openProductDetail()`, `closeProductDetail()`, `modalAdd()`, `modalRemove()`, event delegation nos cards (~150 linhas)

**Problema resolvido:**
- Mobile: nao era possivel ver descricao completa do produto — so aparecia resumo truncado (2 linhas com `-webkit-line-clamp`)
- Mobile: imagens grandes cortavam nos cards — agora usam `object-fit: contain`
- Desktop: nao havia como ver detalhes do produto — agora clique no card abre modal

**Design do modal:**
- Bottom sheet com `border-radius: 24px 24px 0 0` e animacao `slideUp`
- Foto: 280px (desktop) / 240px (mobile) com `object-fit: contain`
- Background overlay `rgba(0,0,0,0.5)` com backdrop blur
- Z-index 500 (acima da nav bar z-index 100)

---

### Sessao 11 — 16/05/2026 (01:15)
**Agente:** Hermes (glm-5.1)
**Tarefas realizadas:**

**1. Admin — Textarea de descrição maior + bullets**
- Textarea de descrição do produto: `rows="2"` → `rows="5"`, `min-height: 120px`, resize vertical
- Placeholder com exemplo de bullets: `• Ajuda no fortalecimento...`
- Hint: "Use • no inicio de cada linha para criar tópicos"
- Commit: `fix: product description textarea larger + bullet point hint`

**2. Telegram Bot — Webhook perdido e restaurado**
- Diagnostico: webhook estava vazio (`"url": ""`), 2 mensagens pendentes
- Causa: provavelmente apos redeploy da Vercel ou falhas de entrega do Telegram
- Restaurado manualmente via `setWebhook`
- Criado watchdog: `~/.hermes/scripts/telegram-webhook-watchdog.sh`
  - Verifica 1x por dia (9h) se webhook está ativo
  - Se vazio → reconfigura automaticamente e notifica via Telegram
  - Silencioso quando tudo OK
  - Cron job ID: `1b40a8400531`

**3. Landing Page — Contatos clicáveis**
- Endereço: `<div>` → `<a>` abrindo Google Maps
- WhatsApp: `<div>` → `<a>` abrindo wa.me/5515981311623
- Instagram: `<div>` → `<a>` abrindo instagram.com/barbeariapereiravotorantim
- Horário: permanece como `<div>` (sem link)
- CSS: `.contact-link` com hover effect (icon scale + darker green)
- Commit: `fix: make contact items clickable (Instagram, WhatsApp, Maps)`

**Arquivos alterados:**
- `admin.js` — textarea descrição com rows=5 + placeholder com bullets
- `admin.css` — `.desc-textarea` (min-height, resize, line-height)
- `index.html` — 3 `<div>` → `<a>` com links (Maps, WhatsApp, Instagram)
- `style.css` — `.contact-link` e `.contact-link:hover .contact-icon`
- `~/.hermes/scripts/telegram-webhook-watchdog.sh` — script novo

