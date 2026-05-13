# Pereira's Barber Shop

**SINCE 2016** | Good Times, Great People, Quality Cut | The Only One

Barbearia em Votorantim, SP. Landing page + sistema de agendamento online com painel administrativo.

## Acesso

- **Site:** https://pereira-barbershop.vercel.app
- **Agendamento:** https://pereira-barbershop.vercel.app/agendar.html
- **Admin:** https://pereira-barbershop.vercel.app/admin.html

## Stack

- Site estatico: HTML + CSS + JS puro
- Banco de dados: Supabase (PostgreSQL)
- Autenticacao: Supabase Auth
- Deploy: Vercel (static files, sem build)
- Servidor local: FastAPI (`server.py`) servindo `static/` na porta 8000

## Estrutura

```
index.html           Landing page
style.css            Estilos da landing
agendar.html         Pagina de agendamento
agendar.css / .js    Logica e estilos do agendamento
admin.html           Painel administrativo (login + CRUD)
admin.css / .js      Logica e estilos do admin
supabase-config.js   Config do Supabase (anon key)
supabase-schema.sql  SQL das tabelas (referencia)
logo.png             Logo oficial
favicon.svg          Favicon (tesoura de barbeiro)
vercel.json          Config do Vercel
server.py            Servidor local FastAPI
AGENTS.md            Documentacao tecnica do projeto
static/              Copia dos arquivos para servidor local
```

## Desenvolvimento Local

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python server.py
```

Acesse `http://localhost:8000`

## Funcionalidades

- Landing page tipo cartao de visitas digital
- Agendamento online (escolher barbeiro, data/hora, servico)
- Verificacao de disponibilidade em tempo real
- Confirmacao via WhatsApp
- Painel admin com login (Supabase Auth)
- Dashboard com estatisticas
- CRUD de barbeiros e servicos
- Historico de agendamentos com filtros
- Gerenciamento de administradores
