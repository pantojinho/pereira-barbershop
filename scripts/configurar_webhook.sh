#!/bin/bash
#
# Script para configurar o webhook do Telegram
# Isso faz o bot funcionar 24/7 automaticamente!
#
# Uso: bash scripts/configurar_webhook.sh

BOT_TOKEN="8932305524:AAE4CBvVQb-lMG4lnE57WVRKr7Pdwteewds"
WEBHOOK_URL="https://www.pereira-barbershop.com.br/api/telegram"

echo "=" | tr '=' '-'
echo "🔗 Configurando Webhook do Telegram"
echo "=" | tr '=' '-'
echo ""

echo "📍 Webhook URL: $WEBHOOK_URL"
echo ""

# Configurar webhook
echo "🚀 Enviando configuração..."
RESPONSE=$(curl -s -X POST \
  "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"$WEBHOOK_URL\"}")

# Verificar resultado
if echo "$RESPONSE" | jq -e '.ok' > /dev/null 2>&1; then
    echo "✅ Webhook configurado com sucesso!"
    echo ""
    echo "=" | tr '=' '-'
    echo "📱 INFORMAÇÕES:"
    echo "=" | tr '=' '-'
    echo ""

    # Mostrar info do webhook
    WEBHOOK_INFO=$(curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo")
    echo "$WEBHOOK_INFO" | jq '.'

    echo ""
    echo "=" | tr '=' '-'
    echo "🎉 Bot agora funciona 24/7 automaticamente!"
    echo "=" | tr '=' '-'
    echo ""
    echo "💡 Comandos disponíveis:"
    echo "   • /start - Ver Chat ID"
    echo "   /hoje  - Ver agendamentos de hoje"
    echo ""
    echo "🚀 Teste: Mande /start para o bot agora!"
    echo "   https://t.me/PereiraBarbershop_bot"

else
    echo "❌ Erro ao configurar webhook:"
    echo "$RESPONSE"
    exit 1
fi