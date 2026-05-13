# AGENTS.md — Memoria e Orientacao do Sistema

> Este arquivo e a "memoria" compartilhada entre agentes de IA que trabalham neste projeto.
> **SEMPRE leia este arquivo no inicio de cada sessao.**
> **SEMPRE atualize o log no final de cada sessao.**

---

## Projeto

**Nome:** Pereira's Barber Shop — Landing Page
**URL Producao:** https://pereira-barbershop.vercel.app
**Repo:** https://github.com/ciandrini/pereira-barbershop
**Framework:** Site estatico (HTML + CSS puro)
**Deploy:** Vercel (static files, sem framework, sem build)
**Servidor local:** FastAPI (`server.py`) servindo pasta `static/` na porta 8000

### Proposito
Landing page tipo "cartao de visitas digital" para a barbearia Pereira's Barber Shop em Votorantim, SP. Exibe logo, informacoes de contato, endereco, horario de funcionamento e QR Code para agendamento.

---

## Arquitetura

```
/
  index.html          ← Pagina principal (raiz, usada pelo Vercel)
  style.css           ← Estilos (raiz, usada pelo Vercel)
  logo.png            ← Logo oficial (raiz, usada pelo Vercel)
  favicon.svg         ← Favicon (raiz, usada pelo Vercel)
  vercel.json         ← Config do Vercel (framework: null, outputDirectory: ".")
  server.py           ← Servidor local FastAPI (para desenvolvimento local)
  requirements.txt    ← Dependencies Python (GITIGNORED - nao vai para o Vercel)
  static/             ← Pasta usada pelo server.py local
    index.html        ← Copia da pagina (mantida sincronizada)
    style.css         ← Copia dos estilos (mantida sincronizada)
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
