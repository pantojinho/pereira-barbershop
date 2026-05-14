# 📲 Configuração Telegram para Barbeiros

## Passo 1: Abrir o Bot

**Link do bot:** https://t.me/PereiraBarbershop_bot

Clique no link acima ou procure `@PereiraBarbershop_bot` no Telegram.

---

## Passo 2: Iniciar Conversa

Abra o bot e envie o comando:

```
/start
```

Isso inicia a conversa e permite que o bot te mande mensagens.

---

## Passo 3: Descobrir seu Chat ID

Há 2 formas de fazer isso:

### Forma A: Fácil (Solicitar ao Admin)

1. Abra o bot `@PereiraBarbershop_bot`
2. Envie qualquer mensagem (ex: `ola`)
3. **Avisar o Gabriel** que seu ID está pronto para ser configurado
4. O Gabriel vai buscar seu ID no sistema e configurar no painel admin

### Forma B: Manual (Para quem quiser fazer sozinho)

**Para barbeiros com perfil técnico:**

1. Abra o bot e envie `/start`
2. Acesse este link no navegador:
   ```
   https://api.telegram.org/bot8932305524:AAE4CBvVQb-lMG4lnE57WVRKr7Pdwteewds/getUpdates
   ```
3. Procure por `"chat": { "id": NÚMERO }`
4. Esse número é seu Chat ID

---

## Passo 4: Admin Configura no Sistema

O Gabriel (ou outro admin) faz:

1. Acessar: https://pereira-barbershop.vercel.app/admin.html
2. Fazer login
3. Ir em **Barbeiros**
4. Clicar no barbeiro
5. Colar o **Chat ID** no campo "Telegram Chat ID (para notificações)"
6. Salvar

---

## Como Funciona?

Depois de configurado, você **não precisa fazer mais nada**! 🎉

Quando um cliente agendar pelo site, você receberá automaticamente no Telegram:

- ✂️ **Nome do cliente**
- 📅 **Data e horário**
- 💇 **Serviço escolhido**
- 📱 **Telefone do cliente**

---

## Exemplo de Mensagem Recebida

```
✂️ Novo Agendamento pelo Site!

👤 Cliente: João Silva
⏰ Horário: 14:00
💇 Serviço: Corte, Barbaterapia
📅 Data: 15/05/2026
📱 Telefone: 15 98765-4321

Pereira's Barber Shop
```

---

## Dúvidas Frequentes

**P: Preciso ficar com o Telegram aberto?**
R: Não! As notificações chegam mesmo se o app estiver fechado.

**P: Funciona no celular e computador?**
R: Sim! Funciona em todos os dispositivos.

**P: Posso desativar as notificações?**
R: Sim, vá nas configurações do chat e desative "Notifications".

**P: E se eu mudar de número de telefone?**
R: O Chat ID pode mudar. Nesse caso, repita o Passo 3 e avise o admin para atualizar.

---

## Teste Rápido

Depois de configurar, peça para alguém fazer um agendamento de teste no site:
https://pereira-barbershop.vercel.app/agendar.html

Você deve receber a notificação em **menos de 1 segundo**! 🚀