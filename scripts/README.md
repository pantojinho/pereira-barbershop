# Scripts de Configuração

## configurar_webhook.sh

Script para configurar o webhook do Telegram para funcionar 24/7 automaticamente.

### Uso

```bash
cd ~/temp/pereira-barbershop
bash scripts/configurar_webhook.sh
```

### O que faz

1. Configura o webhook do Telegram para apontar para a Vercel Function
2. Faz o bot responder automaticamente 24/7
3. Mostra informações do webhook configurado

### Quando usar

- **Após fazer deploy** da `/api/telegram.js`
- Se o webhook foi desconfigurado
- Para verificar se o bot está funcionando 24/7

### Exemplo de saída

```
🔗 Configurando Webhook do Telegram
--------------------------------------------------

📍 Webhook URL: https://pereira-barbershop.vercel.app/api/telegram

🚀 Enviando configuração...
✅ Webhook configurado com sucesso!

--------------------------------------------------
📱 INFORMAÇÕES:
--------------------------------------------------

{
  "ok": true,
  "result": {
    "url": "https://pereira-barbershop.vercel.app/api/telegram",
    "has_custom_certificate": false,
    "pending_update_count": 0
  }
}

--------------------------------------------------
🎉 Bot agora funciona 24/7 automaticamente!
--------------------------------------------------

💡 Comandos disponíveis:
   • /start - Ver Chat ID
   /hoje  - Ver agendamentos de hoje

🚀 Teste: Mande /start para o bot agora!
   https://t.me/PereiraBarbershop_bot
```

### Fluxo de trabalho completo

1. **Fazer deploy do código:**
   ```bash
   cd ~/temp/pereira-barbershop
   git add api/telegram.js scripts/configurar_webhook.sh
   git commit -m "feat: bot telegram 24/7"
   git push origin main
   ```

2. **Aguardar deploy Vercel** (1-2 minutos)

3. **Configurar webhook:**
   ```bash
   bash scripts/configurar_webhook.sh
   ```

4. **Testar:**
   - Mande `/start` para o bot
   - Deve responder INSTANTANEAMENTE

### Como funciona o webhook

- Telegram envia mensagens para: `https://pereira-barbershop.vercel.app/api/telegram`
- Vercel roda a função `/api/telegram.js` automaticamente
- A função processa a mensagem e responde
- Funciona 24/7 sem precisar de servidor dedicado

### Requisitos

- `curl` para chamadas API
- `jq` para processamento JSON
- Deploy feito no Vercel

### Troubleshooting

#### Bot não responde

Verifique o webhook:

```bash
curl -s "https://api.telegram.org/bot8932305524:AAE4CBvVQb-lMG4lnE57WVRKr7Pdwteewds/getWebhookInfo" | jq
```

A `url` deve ser: `https://pereira-barbershop.vercel.app/api/telegram`

#### Erro ao configurar

Verifique se o deploy terminou:
- Acesse: https://vercel.com/pantojinho/pereira-barbershop
- Veja se o último deploy está "Ready"

### Remover webhook

Para voltar ao modo manual (não recomendado):

```bash
curl -s -X POST "https://api.telegram.org/bot8932305524:AAE4CBvVQb-lMG4lnE57WVRKr7Pdwteewds/deleteWebhook"
```