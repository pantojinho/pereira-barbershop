#!/bin/bash
#
# Script para buscar Chat IDs de usuários que iniciaram o bot
# Uso: bash scripts/configurar_barbeiros.sh

BOT_TOKEN="8932305524:AAE4CBvVQb-lMG4lnE57WVRKr7Pdwteewds"

echo "📲 Buscando Chat IDs..."
echo ""

# Buscar últimos 20 updates
response=$(curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?limit=20")

if echo "$response" | grep -q '"ok":true'; then
    echo "✅ Dados obtidos com sucesso!"
    echo ""
    echo "📋 Lista de usuários que iniciaram o bot:"
    echo ""

    # Extrair chat IDs únicos
    echo "$response" | jq -r '
        .result[]
        | select(.message != null)
        | {chat_id: .message.chat.id, name: .message.from.first_name, username: .message.from.username, text: .message.text}
        | "ID: \(.chat_id) | Nome: \(.name) | @\(.username // "sem usuario") | Msg: \(.text // "imagem/emoji")"
    ' | sort -u

    echo ""
    echo "=" | tr '=' '-'
    echo ""
    echo "💾 SQL para atualizar no Supabase:"
    echo ""
    echo "$response" | jq -r '
        .result[]
        | select(.message != null)
        | .message
        | "UPDATE barbers SET telegram_chat_id = \"\(.chat.id)\" WHERE name = \"\(.from.first_name)\";"
    ' | sort -u

else
    echo "❌ Erro ao buscar dados"
    echo "$response"
fi

echo ""
echo "=" | tr '=' '-'
echo ""
echo "🚀 Painel admin: https://pereira-barbershop.vercel.app/admin.html"