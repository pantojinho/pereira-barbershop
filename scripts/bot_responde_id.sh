#!/bin/bash
#
# Script para fazer o bot responder com o Chat ID
# Uso: bash bot_responde_id.sh

BOT_TOKEN="8932305524:AAE4CBvVQb-lMG4lnE57WVRKr7Pdwteewds"

echo "=" | tr '=' '-'
echo "🤖 Bot Pereira Barbershop - Responder Chat IDs"
echo "=" | tr '=' '-'
echo ""

# Buscar mensagens
echo "📨 Buscando mensagens..."
UPDATES=$(curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?limit=20")

# Verificar se há mensagens
if ! echo "$UPDATES" | jq -e '.ok' > /dev/null 2>&1; then
    echo "❌ Erro ao buscar mensagens"
    echo "$UPDATES"
    exit 1
fi

COUNT=$(echo "$UPDATES" | jq -r '.result | length')

if [ "$COUNT" -eq 0 ]; then
    echo "📭 Nenhuma mensagem encontrada."
    echo ""
    echo "💡 Peça para os barbeiros:"
    echo "   1. Abrir: https://t.me/PereiraBarbershop_bot"
    echo "   2. Enviar: /start"
    echo "   3. Rodar este script novamente"
    exit 0
fi

echo "✅ Encontradas $COUNT mensagens"
echo ""

# Processar cada mensagem único
SENT=0
SEEN_IDS=""

# Extrair Chat IDs únicos
CHAT_IDS=$(echo "$UPDATES" | jq -r '
    .result[]
    | select(.message != null)
    | .message.chat.id
' | sort -u)

for CHAT_ID in $CHAT_IDS; do
    # Pular se já enviou para este ID
    if echo "$SEEN_IDS" | grep -q "$CHAT_ID"; then
        continue
    fi

    # Pegar o nome
    NAME=$(echo "$UPDATES" | jq -r --arg id "$CHAT_ID" '
        .result[]
        | select(.message.chat.id == ($id | tonumber))
        | .message.from.first_name
    ' | head -1)

    # Enviar mensagem com o Chat ID
    MSG="👋 Oi, $NAME!

📱 Seu Chat ID é: $CHAT_ID

💡 Copie este número e envie para o Gabriel!

Ou use este link direto:
https://t.me/PereiraBarbershop_bot"

    # Enviar
    RESPONSE=$(curl -s -X POST \
        "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
        -H "Content-Type: application/json" \
        -d "{\"chat_id\": $CHAT_ID, \"text\": \"$MSG\"}")

    # Verificar se enviou
    if echo "$RESPONSE" | jq -e '.ok' > /dev/null 2>&1; then
        echo "✅ Enviado para $NAME (ID: $CHAT_ID)"
        SENT=$((SENT + 1))
    else
        echo "❌ Erro para $NAME: $(echo "$RESPONSE" | jq -r '.description')"
    fi

    SEEN_IDS="$SEEN_IDS $CHAT_ID"
done

echo ""
echo "=" | tr '=' '-'
echo "🎉 Respostas enviadas: $SENT"
echo "=" | tr '=' '-'
echo ""
echo "🚀 Agora os barbeiros têm o Chat ID!"
echo "💡 Eles podem copiar e mandar para você configurar."