import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { createVerificationEmbed } from "../utils/embeds";
import { config } from "../config";

export const data = new SlashCommandBuilder()
  .setName("setup-verificar")
  .setDescription("Publica o painel oficial de vinculação e verificação de conta da Overclock Store")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.channel || !("send" in interaction.channel)) {
    await interaction.reply({
      content: "Este comando só pode ser executado em canais de texto do servidor.",
      ephemeral: true,
    });
    return;
  }

  const embed = createVerificationEmbed();
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setLabel("Vincular Conta no Site")
      .setStyle(ButtonStyle.Link)
      .setURL(`${config.store.siteUrl}/dashboard`)
      .setEmoji("🔗")
  );

  await interaction.channel.send({
    embeds: [embed],
    components: [row],
  });

  await interaction.reply({
    content: "✅ Painel de verificação de conta publicado com sucesso neste canal!",
    ephemeral: true,
  });
}
