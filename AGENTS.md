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

### Plano do Sistema Completo (Roadmap)

#### Fase 1 — Atual (Concluida)
- [x] Landing page funcional no Vercel
- [x] QR Code real na landing page
- [x] Pagina de agendamento (frontend)

#### Fase 2 — Backend + Banco de Dados
- [ ] Configurar Supabase (PostgreSQL + Auth)
- [ ] Criar tabelas: barbeiros, servicos, agendamentos, usuarios_admin
- [ ] Backend FastAPI conectado ao Supabase
- [ ] Substituir dados estaticos por chamadas a API
- [ ] Deploy do backend (Oracle Cloud Free ou Render Free)

#### Fase 3 — Painel Admin
- [ ] Tela de login (Supabase Auth)
- [ ] Dashboard com agenda do dia
- [ ] Gerenciar barbeiros, servicos, horarios
- [ ] Historico de agendamentos
- [ ] Cancelar/reagendar

#### Fase 4 — WhatsApp
- [ ] Configurar Evolution API (self-hosted) ou Z-API
- [ ] Notificacao de confirmacao para cliente
- [ ] Notificacao de novo agendamento para dono
- [ ] Lembrete 1h antes do horario
- [ ] Notificacao de cancelamento

#### Fase 5 — Melhorias
- [ ] Chatbot WhatsApp para agendamento
- [ ] Relatorios (faturamento, clientes recorrentes)
- [ ] Sistema de avaliacao

---

<!-- TEMPLATE PARA NOVAS SESSOES
### Sessao X — DD/MM/AAAA (HH:MM)
**Agente:** [nome do agente/modelo]
**Tarefas realizadas:**
- [item 1]
- [item 2]

**Pendencias:**
- [item pendente]

**Notas:**
- [observacoes uteis para proximos agentes]
-->
