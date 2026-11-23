import {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  Interaction,
} from "discord.js";
import { config } from "./config";
import { deployCommands } from "./deploy-commands";

// Comandos
import * as setupVerificar from "./commands/setup-verificar";
import * as setupTicket from "./commands/setup-ticket";
import * as painelProduto from "./commands/painel-produto";
import * as setupLoja from "./commands/setup-loja";
import * as setupStatus from "./commands/setup-status";
import * as anunciar from "./commands/anunciar";
import * as setupRegras from "./commands/setup-regras";
import * as setupAvaliacoes from "./commands/setup-avaliacoes";
import * as setupPainelStaff from "./commands/setup-painel-staff";
import * as cliente from "./commands/cliente";
import * as pedido from "./commands/pedido";
import * as estoque from "./commands/estoque";

// Módulos de Interação
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
import {
  handleStoreDrawerSelect,
  handleRefreshStoreCatalog,
} from "./modules/store-drawer";
import { handleRefreshStatusPanel } from "./commands/setup-status";
import {
  handleOpenReviewModal,
  handleSubmitReviewModal,
} from "./modules/reviews";
import {
  handleStaffChangeStatusStart,
  handleStaffStatusProductSelect,
  handleStaffStatusValueSelect,
  handleStaffAddKeysStart,
  handleStaffStockVariantSelect,
  handleStaffAddKeysModal,
  handleStaffSalesSummary,
  handleStaffViewStock,
} from "./modules/staff";

console.log("⚡ [OVERCLOCK_BOT] Inicializando Bot Oficial da Overclock Store...");

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

  // Sincroniza todos os slash commands na guilda automaticamente no ready
  try {
    await deployCommands();
  } catch (err) {
    console.warn("⚠️ [OVERCLOCK_BOT] Aviso: Não foi possível sincronizar comandos no ready:", err);
  }
});

client.on(Events.InteractionCreate, async (interaction: Interaction) => {
  try {
    // ----------------------------------------------------
    // 1. Slash Commands
    // ----------------------------------------------------
    if (interaction.isChatInputCommand()) {
      const { commandName } = interaction;
      if (commandName === "setup-verificar") {
        await setupVerificar.execute(interaction);
      } else if (commandName === "setup-ticket") {
        await setupTicket.execute(interaction);
      } else if (commandName === "painel-produto") {
        await painelProduto.execute(interaction);
      } else if (commandName === "setup-loja") {
        await setupLoja.execute(interaction);
      } else if (commandName === "setup-status") {
        await setupStatus.execute(interaction);
      } else if (commandName === "anunciar") {
        await anunciar.execute(interaction);
      } else if (commandName === "setup-regras") {
        await setupRegras.execute(interaction);
      } else if (commandName === "setup-avaliacoes") {
        await setupAvaliacoes.execute(interaction);
      } else if (commandName === "setup-painel-staff") {
        await setupPainelStaff.execute(interaction);
      } else if (commandName === "cliente") {
        await cliente.execute(interaction);
      } else if (commandName === "pedido") {
        await pedido.execute(interaction);
      } else if (commandName === "estoque") {
        await estoque.execute(interaction);
      }
      return;
    }

    // ----------------------------------------------------
    // 2. Autocomplete
    // ----------------------------------------------------
    if (interaction.isAutocomplete()) {
      if (interaction.commandName === "painel-produto") {
        await painelProduto.autocomplete(interaction);
      }
      return;
    }

    // ----------------------------------------------------
    // 3. Menus de Seleção (StringSelectMenu)
    // ----------------------------------------------------
    if (interaction.isStringSelectMenu()) {
      const customId = interaction.customId;

      if (customId === "ticket_category_select") {
        await handleTicketCreate(interaction);
      } else if (customId.startsWith("select_buy_variant:")) {
        const slug = customId.split(":")[1];
        await handleVariantSelect(interaction, slug);
      } else if (customId === "select_store_drawer_product") {
        await handleStoreDrawerSelect(interaction);
      } else if (customId === "select_staff_status_product") {
        await handleStaffStatusProductSelect(interaction);
      } else if (customId.startsWith("select_staff_status_value:")) {
        const slug = customId.split(":")[1];
        await handleStaffStatusValueSelect(interaction, slug);
      } else if (customId === "select_staff_stock_variant") {
        await handleStaffStockVariantSelect(interaction);
      }
      return;
    }

    // ----------------------------------------------------
    // 4. Botões (Buttons)
    // ----------------------------------------------------
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
      } else if (customId === "btn_refresh_store_catalog") {
        await handleRefreshStoreCatalog(interaction);
      } else if (customId === "btn_refresh_status_panel") {
        await handleRefreshStatusPanel(interaction);
      } else if (customId.startsWith("btn_open_review_modal:")) {
        const targetChannelId = customId.split(":")[1];
        await handleOpenReviewModal(interaction, targetChannelId);
      } else if (customId === "btn_staff_change_status") {
        await handleStaffChangeStatusStart(interaction);
      } else if (customId === "btn_staff_add_keys") {
        await handleStaffAddKeysStart(interaction);
      } else if (customId === "btn_staff_sales_summary") {
        await handleStaffSalesSummary(interaction);
      } else if (customId === "btn_staff_view_stock") {
        await handleStaffViewStock(interaction);
      }
      return;
    }

    // ----------------------------------------------------
    // 5. Modais (ModalSubmit)
    // ----------------------------------------------------
    if (interaction.isModalSubmit()) {
      const customId = interaction.customId;

      if (customId.startsWith("modal_cart_email:")) {
        const parts = customId.split(":");
        const slug = parts[1];
        const variantId = parts[2];
        await handleCartEmailModal(interaction, slug, variantId);
      } else if (customId.startsWith("modal_anuncio:")) {
        await anunciar.handleAnuncioModal(interaction);
      } else if (customId.startsWith("modal_submit_review:")) {
        await handleSubmitReviewModal(interaction);
      } else if (customId.startsWith("modal_staff_add_keys:")) {
        const variantId = customId.split(":")[1];
        await handleStaffAddKeysModal(interaction, variantId);
      }
      return;
    }
  } catch (error: any) {
    console.error("[BOT_INTERACTION_ERROR]", error);
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

// Tratamento de Erros Globais
process.on("unhandledRejection", (reason) => {
  console.error("💥 [UNHANDLED_REJECTION]", reason);
});

process.on("uncaughtException", (error) => {
  console.error("💥 [UNCAUGHT_EXCEPTION]", error);
});

// Encerramento Gracioso
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
