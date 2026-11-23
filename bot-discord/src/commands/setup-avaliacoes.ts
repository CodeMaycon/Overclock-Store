import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
} from "discord.js";
import { createBaseEmbed, COLORS } from "../utils/embeds";

export const data = new SlashCommandBuilder()
  .setName("setup-avaliacoes")
  .setDescription("Publica o painel de avaliações para clientes verificados")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addChannelOption((opt) =>
    opt
      .setName("canal_reviews")
      .setDescription("Canal onde as avaliações dos clientes serão postadas (padrão: canal atual)")
      .setRequired(false)
      .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.channel || !("send" in interaction.channel)) {
    await interaction.reply({
      content: "Este comando só pode ser executado em canais de texto do servidor.",
      ephemeral: true,
    });
    return;
  }

  const targetChannel = interaction.options.getChannel("canal_reviews") || interaction.channel;

  if (!targetChannel || !("send" in targetChannel)) {
    await interaction.reply({
      content: "Canal inválido para publicação de avaliações.",
      ephemeral: true,
    });
    return;
  }

  const embed = createBaseEmbed(COLORS.PRIMARY)
    .setTitle("⭐ Avaliações dos Clientes — Overclock Store")
    .setDescription(
      "Sua opinião é fundamental para aprimorarmos continuamente nossa infraestrutura, produtos e qualidade de atendimento!\n\n" +
      "Se você já adquiriu algum de nossos softwares, compartilhe sua experiência com a comunidade clicando no botão abaixo.\n\n" +
      "🔒 *Apenas membros verificados com o cargo de Cliente podem enviar avaliações.*"
    )
    .addFields(
      {
        name: "🏆 100% Avaliações Verificadas",
        value: "Todas as notas são enviadas por compradores reais com entrega confirmada.",
        inline: true,
      },
      {
        name: "⚡ Atendimento Rápido",
        value: "Avalie nosso suporte, estabilidade e velocidade de entrega.",
        inline: true,
      }
    );

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`btn_open_review_modal:${targetChannel.id}`)
      .setLabel("Avaliar Compra")
      .setStyle(ButtonStyle.Success)
      .setEmoji("⭐")
  );

  await interaction.channel?.send({
    embeds: [embed],
    components: [row],
  });

  await interaction.reply({
    content: `✅ Painel de avaliações configurado! Os reviews serão publicados em <#${targetChannel.id}>.`,
    ephemeral: true,
  });
}
