import {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  Interaction,
} from "discord.js";
import { config } from "./config";
import { deployCommands } from "./deploy-commands";
import * as setupVerificar from "./commands/setup-verificar";
import * as setupTicket from "./commands/setup-ticket";
import * as painelProduto from "./commands/painel-produto";
import { handleTicketCreate, handleTicketClose } from "./modules/tickets";
import {
  handleRefreshStock,
  handleBuyPixStart,
  handleVariantSelect,
  handleCartEmailModal,
  handleCopyPixCode,
  handleCancelCart,
  handleFinishCart,
} from "./modules/sales";

console.log("⚡ [OVERCLOCK_BOT] Iniciando inicialização do Bot Oficial...");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel, Partials.Message, Partials.GuildMember, Partials.User],
});

client.once(Events.ClientReady, async (c) => {
  console.log(`🤖 [OVERCLOCK_BOT] Conectado com sucesso como: ${c.user.tag}`);
  console.log(`📡 [OVERCLOCK_BOT] Servidor Oficial vinculado: ${config.discord.guildId}`);
  console.log(`🌐 [OVERCLOCK_BOT] Loja vinculada: ${config.store.siteUrl}`);

  // Registra / sincroniza comandos na guilda instantaneamente no startup
  try {
    await deployCommands();
  } catch (err) {
    console.warn("⚠️ [OVERCLOCK_BOT] Aviso: Não foi possível atualizar comandos no ready (verifique permissões do bot).");
  }
});

client.on(Events.InteractionCreate, async (interaction: Interaction) => {
  try {
    // 1. Slash Commands
    if (interaction.isChatInputCommand()) {
      const { commandName } = interaction;
      if (commandName === "setup-verificar") {
        await setupVerificar.execute(interaction);
      } else if (commandName === "setup-ticket") {
        await setupTicket.execute(interaction);
      } else if (commandName === "painel-produto") {
        await painelProduto.execute(interaction);
      }
      return;
    }

    // 2. Autocomplete
    if (interaction.isAutocomplete()) {
      if (interaction.commandName === "painel-produto") {
        await painelProduto.autocomplete(interaction);
      }
      return;
    }

    // 3. Menus de Seleção (StringSelectMenu)
    if (interaction.isStringSelectMenu()) {
      const customId = interaction.customId;

      if (customId === "ticket_category_select") {
        await handleTicketCreate(interaction);
      } else if (customId.startsWith("select_buy_variant:")) {
        const slug = customId.split(":")[1];
        await handleVariantSelect(interaction, slug);
      }
      return;
    }

    // 4. Botões (Buttons)
    if (interaction.isButton()) {
      const customId = interaction.customId;

      if (customId === "btn_close_ticket") {
        await handleTicketClose(interaction);
      } else if (customId.startsWith("btn_refresh_stock:")) {
        const slug = customId.split(":")[1];
        await handleRefreshStock(interaction, slug);
      } else if (customId.startsWith("btn_buy_pix:")) {
        const slug = customId.split(":")[1];
        await handleBuyPixStart(interaction, slug);
      } else if (customId.startsWith("btn_copy_pix:")) {
        const orderId = customId.split(":")[1];
        await handleCopyPixCode(interaction, orderId);
      } else if (customId.startsWith("btn_cancel_cart:")) {
        const orderId = customId.split(":")[1];
        await handleCancelCart(interaction, orderId);
      } else if (customId.startsWith("btn_finish_cart:")) {
        const orderId = customId.split(":")[1];
        await handleFinishCart(interaction, orderId);
      }
      return;
    }

    // 5. Modais (ModalSubmit)
    if (interaction.isModalSubmit()) {
      const customId = interaction.customId;

      if (customId.startsWith("modal_cart_email:")) {
        const parts = customId.split(":");
        const slug = parts[1];
        const variantId = parts[2];
        await handleCartEmailModal(interaction, slug, variantId);
      }
      return;
    }
  } catch (error: any) {
    console.error("[INTERACTION_ERROR]", error);
    const replyTarget = interaction as any;
    if (replyTarget.replied || replyTarget.deferred) {
      await replyTarget.followUp({
        content: `❌ Ocorreu um erro ao processar sua solicitação: ${error?.message || "Erro interno"}`,
        ephemeral: true,
      }).catch(() => {});
    } else if (replyTarget.reply) {
      await replyTarget.reply({
        content: `❌ Ocorreu um erro ao processar sua solicitação: ${error?.message || "Erro interno"}`,
        ephemeral: true,
      }).catch(() => {});
    }
  }
});

// Tratamento global de erros para nunca derrubar o processo
process.on("unhandledRejection", (reason, promise) => {
  console.error("💥 [UNHANDLED_REJECTION]", reason);
});

process.on("uncaughtException", (error) => {
  console.error("💥 [UNCAUGHT_EXCEPTION]", error);
});

// Graceful Shutdown
function handleShutdown(signal: string) {
  console.log(`🛑 [SHUTDOWN] Recebido sinal ${signal}. Desconectando bot com segurança...`);
  client.destroy();
  process.exit(0);
}

process.on("SIGINT", () => handleShutdown("SIGINT"));
process.on("SIGTERM", () => handleShutdown("SIGTERM"));

client.login(config.discord.token).catch((err) => {
  console.error("❌ [LOGIN_ERROR] Falha crítica ao conectar no Discord:", err);
  process.exit(1);
});
