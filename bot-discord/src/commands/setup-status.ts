import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ButtonInteraction,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
import { storeApi, BotProduct } from "../services/store-api";
import { createBaseEmbed, COLORS } from "../utils/embeds";

// Mapa de cooldown para o botão de atualizar status (15 segundos)
const cooldownMap = new Map<string, number>();

export function buildStatusPanelEmbed(products: BotProduct[]): EmbedBuilder {
  const embed = createBaseEmbed(COLORS.PRIMARY)
    .setTitle("📡 Status dos Serviços em Tempo Real — Overclock Store")
    .setDescription(
      "Acompanhe abaixo o status de operação e detecção de cada software do nosso catálogo. " +
      "Nossa equipe de engenharia monitora constantemente todos os serviços para garantir máxima segurança e estabilidade aos nossos clientes."
    );

  if (products.length === 0) {
    embed.addFields({
      name: "Status Geral",
      value: "Nenhum produto cadastrado no catálogo.",
    });
  } else {
    for (const prod of products) {
      let statusBadge = "🔴 Indisponível";
      if (prod.status === "ONLINE") {
        statusBadge = "🟢 Operacional & Indetectável";
      } else if (prod.status === "MAINTENANCE") {
        statusBadge = "🟡 Em Manutenção Preventiva";
      } else if (prod.status === "OUT_OF_STOCK") {
        statusBadge = "⚪ Sem Estoque (Aguardando Reposição)";
      }

      const totalStock = prod.variants.reduce((acc, v) => acc + v.stock, 0);
      const stockInfo = totalStock > 0 ? `\`${totalStock} chaves em estoque\`` : "`Esgotado`";

      embed.addFields({
        name: `⚡ ${prod.name}`,
        value: `**Status:** ${statusBadge}\n**Categoria:** ${prod.category?.name || "Software"}\n**Disponibilidade:** ${stockInfo}`,
        inline: true,
      });
    }
  }

  const nowSp = new Date().toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  embed.addFields({
    name: "🕒 Última Verificação",
    value: `${nowSp} (Horário de Brasília)`,
    inline: false,
  });

  return embed;
}

export function buildStatusPanelComponents(): ActionRowBuilder<ButtonBuilder>[] {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("btn_refresh_status_panel")
      .setLabel("Atualizar Status")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("🔄")
  );
  return [row];
}

export const data = new SlashCommandBuilder()
  .setName("setup-status")
  .setDescription("Publica o painel de status operacional em tempo real da Overclock Store")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.channel || !("send" in interaction.channel)) {
    await interaction.reply({
      content: "Este comando só pode ser executado em canais de texto do servidor.",
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    const products = await storeApi.getProducts();
    const embed = buildStatusPanelEmbed(products);
    const components = buildStatusPanelComponents();

    await interaction.channel.send({
      embeds: [embed],
      components,
    });

    await interaction.editReply({
      content: "✅ Painel de status em tempo real publicado com sucesso neste canal!",
    });
  } catch (error: any) {
    console.error("[SETUP_STATUS_ERROR]", error);
    await interaction.editReply({
      content: `❌ Erro ao publicar painel de status: ${error?.message || "Erro desconhecido"}`,
    });
  }
}

/**
 * Trata o clique no botão "Atualizar Status" com cooldown de 15 segundos
 */
export async function handleRefreshStatusPanel(interaction: ButtonInteraction) {
  const userId = interaction.user.id;
  const lastClick = cooldownMap.get(userId) || 0;
  const now = Date.now();

  if (now - lastClick < 15000) {
    const remaining = Math.ceil((15000 - (now - lastClick)) / 1000);
    await interaction.reply({
      content: `⏳ Por favor, aguarde mais **${remaining}s** antes de atualizar o painel de status novamente.`,
      ephemeral: true,
    });
    return;
  }

  cooldownMap.set(userId, now);
  await interaction.deferUpdate();

  try {
    const products = await storeApi.getProducts();
    const embed = buildStatusPanelEmbed(products);
    const components = buildStatusPanelComponents();

    await interaction.editReply({
      embeds: [embed],
      components,
    });

    await interaction.followUp({
      content: "✅ Painel de status sincronizado com sucesso!",
      ephemeral: true,
    });
  } catch (error: any) {
    console.error("[REFRESH_STATUS_ERROR]", error);
    await interaction.followUp({
      content: `❌ Falha ao atualizar status: ${error?.message || "Erro de conexão"}`,
      ephemeral: true,
    });
  }
}
