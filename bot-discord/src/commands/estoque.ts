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
  .setName("estoque")
  .setDescription("Exibe o mapa completo de estoque de licenças em tempo real");

export async function execute(interaction: ChatInputCommandInteraction) {
  const member = interaction.member as GuildMember | null;

  if (!checkStaffPermission(member)) {
    await interaction.reply({
      content: "❌ Acesso restrito à equipe de Suporte e Administradores.",
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    const products = await storeApi.getProducts();

    const embed = createBaseEmbed(COLORS.PRIMARY)
      .setTitle("📦 Mapa Geral de Estoque — Overclock Store")
      .setDescription(
        "Quantidade real de chaves em estoque (`UNASSIGNED`) por produto e variante:"
      );

    if (products.length === 0) {
      embed.setDescription("Nenhum produto cadastrado no catálogo.");
    } else {
      for (const prod of products) {
        const lines = prod.variants.map((v) => {
          const badge =
            v.stock === 0
              ? "🔴 `0 chaves (Esgotado)`"
              : v.stock <= 3
              ? `🟡 \`${v.stock} chave(s) (Baixo)\``
              : `🟢 \`${v.stock} chaves (Normal)\``;
          return `• **${v.name}:** ${badge} — **${v.priceFormatted}**`;
        });

        embed.addFields({
          name: `⚡ ${prod.name} [${prod.status}]`,
          value: lines.length > 0 ? lines.join("\n") : "Sem variantes cadastradas.",
          inline: false,
        });
      }
    }

    await interaction.editReply({ embeds: [embed] });
  } catch (err: any) {
    console.error("[CMD_ESTOQUE_ERROR]", err);
    await interaction.editReply({
      content: `❌ Falha ao consultar estoque: ${err?.message || "Erro desconhecido"}`,
    });
  }
}
