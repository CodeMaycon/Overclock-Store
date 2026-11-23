# ⚡ Overclock Store — Discord Bot Oficial (Vendas & Tickets)

Bot oficial em Node.js 20+ e Discord.js v14 para atendimento automatizado, tickets de suporte contextualizados e vendas diretas via Pix com sincronização em tempo real com o catálogo da Overclock Store.

---

## 🚀 Como Executar

### 1. Configuração do Ambiente
Copie o arquivo de exemplo e preencha as credenciais:
```bash
cp .env.example .env
```

### 2. Desenvolvimento Local
```bash
npm install
npm run deploy-commands # Registra ou atualiza os Slash Commands na guilda
npm run dev             # Executa com hot-reload via tsx
```

### 3. Build & Produção
```bash
npm run build
npm start
```

### 4. Executando com PM2
```bash
pm2 start ecosystem.config.cjs
pm2 logs overclock-discord-bot
```

### 5. Executando com Docker
```bash
docker build -t overclock-discord-bot .
docker run -d --name overclock-bot --env-file .env overclock-discord-bot
```

---

## 🛠 Slash Commands (Apenas Administradores)
* `/setup-verificar` — Envia o painel de verificação com botão de redirecionamento para vincular a conta na Overclock Store e receber o cargo `@Verificado`.
* `/setup-ticket` — Publica o painel de suporte com menu de seleção (`Dúvida Pré-Compra`, `Suporte Técnico / Instalação`, `Pagamento / Licença`).
* `/painel-produto [slug]` — Publica o card de compra do produto com estoque sincronizado e botão de compra rápida via Pix.
