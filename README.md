<div align="center">

# ✂️ Pereira's Barber Shop

### **Since 2016** — Votorantim, SP

[![Website](https://img.shields.io/website?down_color=red&down_message=offline&up_color=%232D4B40&up_message=online&url=https%3A%2F%2Fwww.pereira-barbershop.com.br)](https://www.pereira-barbershop.com.br)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-000?logo=vercel&logoColor=white)](https://vercel.com)
[![Supabase](https://img.shields.io/badge/Backend-Supabase-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com)
[![Telegram](https://img.shields.io/badge/Notificações-Telegram-26A5E4?logo=telegram&logoColor=white)](https://t.me/PereiraBarbershop_bot)

<br>

**Site completo para barbearia** com landing page, agendamento online, lojinha de produtos, painel administrativo e notificações via Telegram.

[🌐 Visitar Site](https://pereira-barbershop.vercel.app) · [📅 Agendar Horário](https://pereira-barbershop.vercel.app/agendar.html) · [🛒 Lojinha](https://pereira-barbershop.vercel.app/produtos.html) · [👨‍💼 Painel Admin](https://pereira-barbershop.vercel.app/admin.html)

</div>

---

## 📖 Sobre

**Pereira's Barber Shop** é uma barbearia tradicional em **Votorantim, São Paulo**, desde **2016**. Este projeto é o site oficial — um cartão de visitas digital com agendamento online, lojinha de produtos e gestão administrativa.

Construído com **HTML, CSS e JavaScript puros** (sem frameworks), backend no **Supabase** (PostgreSQL, Auth, Storage), deploy no **Vercel** e notificações via **Telegram Bot**.

---

## ⚡ Funcionalidades

- 🏠 **Landing Page** — Cartão de visitas digital com identidade visual vintage
- 📅 **Agendamento Online** — Barbeiro → Serviço → Data/Hora → Dados do Cliente
- 🛒 **Lojinha de Produtos** — Catálogo com carrinho, estoque e checkout via WhatsApp
- 👨‍💼 **Painel Administrativo** — Dashboard, CRUD completo (barbeiros, serviços, produtos, feriados, admins)
- 🔔 **Notificações em Tempo Real** — Sino com badge, som e atualização automática a cada 15s
- 📲 **Telegram Bot** — Barbeiros recebem notificação no Telegram quando chega agendamento
- 🔐 **Autenticação** — Login seguro (Supabase Auth) com roles admin/barbeiro
- 🏖️ **Feriados** — Dias de folga bloqueiam a agenda automaticamente
- 📱 **100% Responsivo** — Mobile-first

---

## 🛠️ Tech Stack

| Tecnologia | Uso |
|---|---|
| **HTML5 + CSS3 + JS** | Frontend completo, sem frameworks |
| **Supabase** | PostgreSQL, Auth, Storage, Realtime |
| **Vercel** | Deploy estático automático (CI/CD) |
| **Telegram Bot API** | Notificações gratuitas para barbeiros |
| **FastAPI** | Servidor local para desenvolvimento |

---

## 📁 Arquitetura

```
pereira-barbershop/
├── index.html              # Landing page
├── style.css               # Estilos landing
├── agendar.html/css/js     # Sistema de agendamento
├── admin.html/css/js       # Painel administrativo
├── produtos.html/css/js    # Lojinha de produtos
├── supabase-config.js      # Credenciais + token Telegram (GITIGNORED)
├── supabase-schema.sql     # SQL — criação das tabelas
├── supabase-security-hardening.sql  # SQL — RLS + segurança
├── logo.png / favicon.svg  # Assets
├── vercel.json             # Config Vercel (deploy estático)
├── server.py               # Servidor local FastAPI
├── static/                 # Cópia para servidor local
├── AGENTS.md               # Memória para agentes de IA
└── README.md               # Este arquivo
```

---

## 🚀 Primeira Instalação

### Pré-requisitos

- Conta no **Supabase** (gratuito)
- Conta no **Vercel** (gratuito)
- Conta no **GitHub**

### Passo a Passo

#### 1. Supabase

1. Crie um projeto em [supabase.com](https://supabase.com)
2. Vá em **SQL Editor** e execute o conteúdo de `supabase-schema.sql`
3. Execute também `supabase-security-hardening.sql`
4. Vá em **Authentication → Providers** e habilite **Email/Password**
5. Crie o primeiro usuário em **Authentication → Add User**
6. Anote a **URL do projeto** e a **anon key** (Settings → API)

#### 2. Configuração local

Crie o arquivo `supabase-config.js` na raiz do projeto:

```javascript
var SUPABASE_URL = 'https://seu-projeto.supabase.co';
var SUPABASE_ANON_KEY = 'sua-anon-key-aqui';
var TELEGRAM_BOT_TOKEN = '';  // Veja seção Telegram abaixo
```

> ⚠️ Este arquivo está no `.gitignore` e **nunca** deve ser commitado.

#### 3. Primeiro administrador

Após criar o usuário no Supabase Auth, insira manualmente na tabela `admins`:

```sql
INSERT INTO admins (user_id, email, role)
VALUES ('uid-do-usuario', 'email@exemplo.com', 'admin');
```

#### 4. Deploy no Vercel

1. Faça push do código para o GitHub
2. Acesse [vercel.com](https://vercel.com) e importe o repositório
3. O `vercel.json` já está configurado — não precisa mudar nada
4. Clique em **Deploy**

> ⚠️ Nunca commit `requirements.txt` no repositório — isso faz o Vercel detectar como projeto Python e quebrar o deploy.

---

## 📲 Configuração do Telegram (Notificações para Barbeiros)

O sistema envia notificações gratuitas via **Telegram Bot** quando chega um novo agendamento. O barbeiro recebe nome do cliente, horário, serviço e data direto no Telegram.

### Criando o Bot

1. Abra o Telegram e procure **@BotFather**
2. Envie `/newbot`
3. Escolha um nome (ex: `Pereira Barber Notifier`)
4. Escolha um username (ex: `pereira_barber_bot`)
5. Copie o **token** fornecido (ex: `123456789:ABCdefGHI...`)
6. Cole o token no `supabase-config.js`:
   ```javascript
   var TELEGRAM_BOT_TOKEN = '123456789:ABCdefGHI...';
   ```

### Cadastrando os Barbeiros

O Telegram **não usa número de telefone** — cada barbeiro precisa de um **Chat ID**. Siga estes passos:

**Passo 1** — Mande o link abaixo para cada barbeiro (pode ser no WhatsApp ou grupo):

```
https://t.me/PereiraBarbershop_bot?start=oi
```

> O barbeiro clica no link, abre o Telegram e aperta **Iniciar**. Pronto.

**Passo 2** — Depois que todos os barbeiros clicarem, acesse no navegador:

```
https://api.telegram.org/bot{SEU_TOKEN}/getUpdates
```

**Passo 3** — Na página que abrir, procure por `"chat":{"id": 123456789}`. O número é o **Chat ID** daquele barbeiro.

**Passo 4** — No painel admin (`/admin.html`), edite o barbeiro e cole o Chat ID no campo **Telegram Chat ID**.

### Exemplo prático

```
Barbeiro: Rafael
1. Rafael clica no link e aperta Iniciar no bot
2. Você acessa getUpdates e encontra: "chat":{"id": 987654321}
3. No painel admin → Barbeiros → Editar Rafael → Telegram Chat ID: 987654321
4. Pronto! Agora Rafael recebe notificação toda vez que agendarem com ele
```

> 💡 **Dica:** Se `getUpdates` mostrar vazio `{"ok":true,"result":[]}`, significa que nenhum barbeiro clicou no link ainda. Peça para eles clicarem e tente novamente.

---

## 🗄️ Banco de Dados (Supabase)

```
┌──────────────┐     ┌────────────────────┐
│   barbers    │     │  barber_schedules  │
├──────────────┤     ├────────────────────┤
│ id (PK)      │◄────│ barber_id (FK)     │
│ name         │     │ day_of_week        │
│ phone        │     │ start_time         │
│ photo_url    │     │ end_time           │
│ telegram_chat_id     └────────────────────┘
│ active       │
│ works_holidays│    ┌────────────────┐
└──────────────┘     │   services     │
                     ├────────────────┤
┌──────────────┐     │ id (PK)        │
│ appointments │     │ name           │
├──────────────┤     │ price          │
│ id (PK)      │     │ duration_min   │
│ barber_id(FK)│──►  │ featured       │
│ appointment_date    │ active         │
│ appointment_time    └────────────────┘
│ client_name  │
│ client_phone │     ┌────────────────┐
│ service_names│     │   products     │
│ obs          │     ├────────────────┤
│ status       │     │ id (PK)        │
│ total_price  │     │ name, desc     │
└──────────────┘     │ price, stock   │
                     │ photo_url      │
┌──────────────┐     │ active         │
│   holidays   │     └────────────────┘
├──────────────┤
│ id (PK)      │     ┌────────────────┐     ┌────────────────┐
│ date         │     │ product_orders │     │     admins     │
│ description  │     ├────────────────┤     ├────────────────┤
│ recurring    │     │ id (PK)        │     │ user_id (PK)   │
└──────────────┘     │ product_ids    │     │ email          │
                     │ client_name    │     │ role           │
                     │ client_phone   │     │ barber_id (FK) │
                     │ total_price    │     └────────────────┘
                     │ status         │
                     └────────────────┘
```

### Status de Agendamentos

| Status | Significado |
|---|---|
| `pending` | Aguardando confirmação |
| `confirmed` | Confirmado pelo admin |
| `completed` | Atendimento concluído |
| `cancelled` | Cancelado |

> 📋 SQL completo em `supabase-schema.sql` e `supabase-security-hardening.sql`.

---

## 🔧 Manutenção do Site

### Tarefas do dia a dia

Tudo é feito pelo **Painel Admin** (`/admin.html`):

| Tarefa | Onde fazer |
|---|---|
| Ver agendamentos do dia | Dashboard (abre automaticamente ao logar) |
| Confirmar/Cancelar agendamento | Clique no agendamento → botões de ação |
| Adicionar/Editar barbeiro | Aba Barbeiros → botão + Novo Barbeiro |
| Alterar horário do barbeiro | Aba Barbeiros → Editar → horários por dia |
| Cadastrar feriado | Aba Feriados → botão + Novo Feriado |
| Adicionar/Editar serviço | Aba Serviços → botão + Novo Serviço |
| Gerenciar produtos | Aba Produtos → CRUD completo |
| Ver pedidos da lojinha | Aba Pedidos |
| Criar novo usuário admin | Aba Usuários → botão + Novo Usuário |

### Notificações no painel admin

- O painel atualiza **automaticamente a cada 15 segundos** — não precisa dar F5
- O **sino** no canto superior mostra quantos agendamentos existem para hoje
- Clique no sino para ver a lista completa de agendamentos do dia
- Quando chega um agendamento novo: **som** + **toast** + **badge vermelho** no sino
- Se o barbeiro tiver Telegram configurado, ele também recebe notificação

### Como adicionar um novo barbeiro

1. Painel Admin → Barbeiros → **+ Novo Barbeiro**
2. Preencha o nome
3. (Opcional) Telefone e foto
4. (Opcional) Telegram Chat ID (veja seção Telegram acima)
5. Marque os dias de trabalho e horários
6. Clique em **Salvar**

### Como alterar preços/serviços

1. Painel Admin → Serviços → **Editar** no serviço desejado
2. Altere preço, duração ou nome
3. Para destacar um serviço como "MAIS PEDIDO", marque o checkbox

### Sincronização de arquivos

Ao editar arquivos HTML/CSS/JS, sempre atualize **ambos**:
- Arquivo na **raiz** (usado pelo Vercel)
- Arquivo na pasta **static/** (usado pelo servidor local)

---

## 🌍 Deploy no Vercel

O deploy é **automático** a cada `git push` na branch `main`.

### Configuração do vercel.json

```json
{
  "framework": null,
  "buildCommand": null,
  "installCommand": null,
  "outputDirectory": "."
}
```

### Para fazer deploy de uma mudança

```bash
git add .
git commit -m "descrição da mudança"
git push
```

O Vercel detecta o push e faz o deploy automaticamente em ~30 segundos.

---

## 🗺️ Roadmap

- [x] 🏠 Landing page
- [x] 📅 Agendamento online
- [x] 👨‍💼 Painel administrativo
- [x] 🛒 Lojinha de produtos
- [x] 🔔 Notificações em tempo real no painel
- [x] 📲 Telegram Bot para barbeiros
- [ ] 📲 Notificações WhatsApp (Evolution API)
- [ ] 🤖 Chatbot WhatsApp para agendamento
- [ ] 📈 Relatórios (faturamento, clientes recorrentes)
- [ ] ⭐ Sistema de avaliação

---

## 🤝 Padrões do Projeto

- **HTML/CSS/JS puros** — sem frameworks
- Arquivos na **raiz** = Vercel, arquivos em `static/` = servidor local
- Sempre sincronize **ambos** ao editar
- `supabase-config.js` e `requirements.txt` **nunca** vão para o Git
- Commits sem emojis, em português ou inglês

---

## 📄 Licença

MIT License — veja o arquivo [LICENSE](LICENSE) para detalhes.

---

## 📞 Contato

<div align="center">

### ✂️ Pereira's Barber Shop — Since 2016

📍 Av. Matheus Conegero, 141, Pq Bela Vista, Votorantim - SP
📞 **15 98131-1623** (WhatsApp)
📸 [@barbeariapereiravotorantim](https://instagram.com/barbeariapereiravotorantim)
🕐 Seg a Sáb: 09h às 19h · Dom: Fechado

**Equipe:** 💈 Rafael · 💈 Gabriel · 💈 Marcus Vinicius

[🌐 Site](https://pereira-barbershop.vercel.app) · [📅 Agendar](https://pereira-barbershop.vercel.app/agendar.html) · [📸 Instagram](https://instagram.com/barbeariapereiravotorantim) · [💬 WhatsApp](https://wa.me/5515981311623)

</div>
