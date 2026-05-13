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
  index.html          ← Pagina principal (raiz, usada pelo Vercel)
  style.css           ← Estilos da landing page (raiz, usada pelo Vercel)
  agendar.html        ← Pagina de agendamento (raiz, usada pelo Vercel)
  agendar.css         ← Estilos da pagina de agendamento (raiz)
  agendar.js          ← Logica do agendamento (raiz)
  logo.png            ← Logo oficial (raiz, usada pelo Vercel)
  favicon.svg         ← Favicon (raiz, usada pelo Vercel)
  vercel.json         ← Config do Vercel (framework: null, outputDirectory: ".")
  server.py           ← Servidor local FastAPI (para desenvolvimento local)
  requirements.txt    ← Dependencies Python (GITIGNORED - nao vai para o Vercel)
  static/             ← Pasta usada pelo server.py local
    index.html        ← Copia da pagina (mantida sincronizada)
    style.css         ← Copia dos estilos (mantida sincronizada)
    agendar.html      ← Copia da pagina de agendamento
    agendar.css       ← Copia dos estilos
    agendar.js        ← Copia da logica
    logo.png          ← Copia da logo
    logo Png.png      ← Arquivo original com espaco no nome
    logo-original.jpg ← Logo antiga (legado)
    favicon.svg       ← Favicon
  docs/
    deployment.md     ← Documentacao de deploy
  AGENTS.md           ← Este arquivo
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
