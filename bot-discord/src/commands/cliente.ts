import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  GuildMember,
} from "discord.js";
import { storeApi } from "../services/store-api";
import { config } from "../config";
import { createBaseEmbed, COLORS } from "../utils/embeds";

function maskEmail(email: string): string {
  const parts = email.split("@");
  if (parts.length !== 2) return "***@***";
  const user = parts[0];
  const domain = parts[1];
  if (user.length <= 2) return `${user[0]}***@${domain}`;
  return `${user[0]}***${user[user.length - 1]}@${domain}`;
}

function checkStaffPermission(member: GuildMember | null): boolean {
  if (!member) return false;
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  if (config.discord.supportRoleId && member.roles.cache.has(config.discord.supportRoleId)) return true;
  return false;
}

export const data = new SlashCommandBuilder()
  .setName("cliente")
  .setDescription("Consulta a ficha e histórico de compras de um cliente na Overclock Store")
  .addUserOption((opt) =>
    opt
      .setName("usuario")
      .setDescription("Selecione o membro do Discord para consultar")
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

  const targetUser = interaction.options.getUser("usuario", true);
  await interaction.deferReply({ ephemeral: true });

  try {
    const res = await storeApi.getUserByDiscordId(targetUser.id);

    if (!res.linked || !res.user) {
      const unlinkedEmbed = createBaseEmbed(COLORS.WARNING)
        .setTitle(`👤 Ficha: @${targetUser.username}`)
        .setDescription(
          `Este membro (<@${targetUser.id}>) **não possui conta vinculada** na Overclock Store.`
        )
        .addFields({
          name: "Status de Vínculo",
          value: "❌ Conta Desvinculada",
          inline: true,
        });

      await interaction.editReply({ embeds: [unlinkedEmbed] });
      return;
    }

    const u = res.user;
    const masked = maskEmail(u.email);

    const embed = createBaseEmbed(COLORS.PRIMARY)
      .setTitle(`🛡️ Ficha do Cliente — @${u.discordUsername || targetUser.username}`)
      .setThumbnail(targetUser.displayAvatarURL())
      .addFields(
        { name: "Nome Completo", value: u.fullName, inline: true },
        { name: "Username no Site", value: `@${u.username}`, inline: true },
        { name: "E-mail (Protegido)", value: `\`${masked}\``, inline: true },
        {
          name: "Status da Conta",
          value: u.isBanned ? `🔴 **Banido** (${u.banReason || "Sem motivo"})` : "🟢 **Regular**",
          inline: true,
        },
        {
          name: "Vínculo Discord",
          value: u.discordLinkedAt
            ? new Date(u.discordLinkedAt).toLocaleDateString("pt-BR")
            : "Sim",
          inline: true,
        },
        {
          name: "Total de Compras Concluídas",
          value: `**${u.totalCompletedOrders}** pedido(s)`,
          inline: true,
        }
      );

    if (u.recentOrders && u.recentOrders.length > 0) {
      const orderLines = u.recentOrders.map(
        (o) => `• \`#${o.orderNumber}\` — **${o.product}** (${o.variant}) • ${o.amountFormatted} [${o.status}]`
      );
      embed.addFields({
        name: "📋 Últimos Pedidos",
        value: orderLines.join("\n"),
        inline: false,
      });
    } else {
      embed.addFields({
        name: "📋 Últimos Pedidos",
        value: "Nenhum pedido registrado nesta conta.",
        inline: false,
      });
    }

    await interaction.editReply({ embeds: [embed] });
  } catch (err: any) {
    console.error("[CMD_CLIENTE_ERROR]", err);
    await interaction.editReply({
      content: `❌ Falha ao buscar cliente: ${err?.message || "Erro desconhecido"}`,
    });
  }
}
