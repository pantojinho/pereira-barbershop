# Scripts de Configuração

## configurar_barbeiros.sh

Script para buscar Chat IDs de usuários que iniciaram o bot do Telegram.

### Uso

```bash
cd ~/temp/pereira-barbershop
bash scripts/configurar_barbeiros.sh
```

### O que faz

1. Busca as últimas 20 mensagens no bot
2. Lista todos os usuários com seus Chat IDs
3. Gera SQL pronto para copiar/colar no Supabase

### Exemplo de saída

```
📲 Buscando Chat IDs...

✅ Dados obtidos com sucesso!

📋 Lista de usuários que iniciaram o bot:

ID: 6436594324 | Nome: Pantojo | @sem usuario | Msg: /start
ID: 123456789 | Nome: Rafael | @rafael_barber | Msg: oi

--------------------------------------------------

💾 SQL para atualizar no Supabase:

UPDATE barbers SET telegram_chat_id = "6436594324" WHERE name = "Pantojo";
UPDATE barbers SET telegram_chat_id = "123456789" WHERE name = "Rafael";
```

### Depois de rodar

1. Copie os SQL commands
2. Vá em https://supabase.com/dashboard/project/seu-projeto/sql
3. Cole e execute
4. Ou use o painel admin: https://pereira-barbershop.vercel.app/admin.html

### Requisitos

- `jq` para processamento JSON
- `curl` para chamadas API