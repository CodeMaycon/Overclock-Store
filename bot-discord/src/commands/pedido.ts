import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  GuildMember,
} from "discord.js";
import { storeApi } from "../services/store-api";
import { config } from "../config";
import { createBaseEmbed, COLORS } from "../utils/embeds";

function checkStaffPermission(member: GuildMember | null): boolean {
  if (!member) return false;
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  if (config.discord.supportRoleId && member.roles.cache.has(config.discord.supportRoleId)) return true;
  return false;
}

export const data = new SlashCommandBuilder()
  .setName("pedido")
  .setDescription("Consulta informações de um pedido Pix na Overclock Store")
  .addStringOption((opt) =>
    opt
      .setName("order_id")
      .setDescription("ID ou Código do Pedido (ex: ORD-BOT-2026-XXXXXX)")
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const member = interaction.member as GuildMember | null;

  if (!checkStaffPermission(member)) {
    await interaction.reply({
      content: "❌ Acesso restrito à equipe de Suporte e Administradores.",
      ephemeral: true,
    });
    return;
  }

  const orderId = interaction.options.getString("order_id", true).trim();
  await interaction.deferReply({ ephemeral: true });

  try {
    const order = await storeApi.getOrder(orderId);

    const statusBadge =
      order.status === "COMPLETED"
        ? "🟢 Concluído / Pago"
        : order.status === "PENDING"
        ? "🟡 Pendente (Aguardando Pix)"
        : order.status === "CANCELLED"
        ? "🔴 Cancelado / Expirado"
        : `⚪ ${order.status}`;

    const embed = createBaseEmbed(COLORS.PRIMARY)
      .setTitle(`📦 Detalhes do Pedido #${order.orderNumber}`)
      .addFields(
        { name: "ID do Pedido", value: `\`${order.orderId}\``, inline: true },
        { name: "Status Oficial", value: statusBadge, inline: true },
        { name: "Valor Total", value: `\`${order.amountFormatted}\``, inline: true }
      );

    if (order.license) {
      embed.addFields(
        { name: "Produto", value: order.license.productName, inline: true },
        { name: "Plano / Variante", value: order.license.variantName, inline: true },
        {
          name: "Chave de Licença",
          value: "🔒 *Oculta por segurança administrativa*",
          inline: true,
        }
      );
    }

    if (order.paidAt) {
      embed.addFields({
        name: "Data de Confirmação",
        value: new Date(order.paidAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
        inline: true,
      });
    }

    if (order.expiresAt) {
      embed.addFields({
        name: "Expiração do Pix",
        value: new Date(order.expiresAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
        inline: true,
      });
    }

    await interaction.editReply({ embeds: [embed] });
  } catch (err: any) {
    console.error("[CMD_PEDIDO_ERROR]", err);
    await interaction.editReply({
      content: `❌ Pedido \`${orderId}\` não encontrado ou erro na consulta: ${err?.message || "Erro desconhecido"}`,
    });
  }
}
