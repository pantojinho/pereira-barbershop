# Scripts de Configuração

## bot_responde_id.sh

Script para fazer o bot responder automaticamente com o Chat ID.

### Uso

```bash
cd ~/temp/pereira-barbershop
bash scripts/bot_responde_id.sh
```

### O que faz

1. Busca todas as mensagens não lidas do bot
2. Responde a cada pessoa com seu Chat ID
3. A pessoa pode copiar o ID e mandar para o admin

### Exemplo de resposta do bot

```
👋 Oi, Pantojo!

📱 Seu Chat ID é: 6436594324

💡 Copie este número e envie para o Gabriel!

Ou use este link direto:
https://t.me/PereiraBarbershop_bot
```

### Fluxo de trabalho

1. **Admin manda para barbeiros:**
   - Link do bot: https://t.me/PereiraBarbershop_bot
   - Instrução: "Envie /start para o bot"

2. **Barbeiro inicia o bot:**
   - Abre o bot
   - Envia /start

3. **Admin roda o script:**
   ```bash
   bash scripts/bot_responde_id.sh
   ```

4. **Bot responde automaticamente:**
   - Cada barbeiro recebe seu Chat ID

5. **Barbeiro manda o ID para o admin:**
   - Pode ser via WhatsApp, Telegram, etc.

6. **Admin configura no painel:**
   - Vai em https://pereira-barbershop.vercel.app/admin.html
   - Edita o barbeiro
   - Cola o Chat ID no campo "Telegram Chat ID"
   - Salva

### Vantagens

- ✅ Não precisa rodar servidor 24/7
- ✅ Barbeiro vê o próprio ID
- ✅ Processo transparente
- ✅ Funciona instantaneamente
- ✅ Usa apenas API REST do Telegram

### Requisitos

- `curl` para chamadas API
- `jq` para processamento JSON

---

## configurar_barbeiros.sh

Script alternativo para buscar Chat IDs manualmente.

### Uso

```bash
cd ~/temp/pereira-barbershop
bash scripts/configurar_barbeiros.sh
```

### Quando usar

Use este script se:
- Quer ver TODOS os Chat IDs de uma vez
- Quer gerar SQL pronto para o Supabase
- Prefere configurar tudo em lote

### Diferença para bot_responde_id.sh

| Script | Bot responde? | Quem vê o ID? |
|--------|--------------|--------------|
| bot_responde_id.sh | ✅ Sim | Barbeiro |
| configurar_barbeiros.sh | ❌ Não | Admin |

### Saída de exemplo

```
📋 Lista de usuários que iniciaram o bot:

ID: 6436594324 | Nome: Pantojo | @sem usuario | Msg: /start
ID: 123456789 | Nome: Rafael | @rafael_barber | Msg: oi

--------------------------------------------------

💾 SQL para atualizar no Supabase:

UPDATE barbers SET telegram_chat_id = "6436594324" WHERE name = "Pantojo";
UPDATE barbers SET telegram_chat_id = "123456789" WHERE name = "Rafael";
```