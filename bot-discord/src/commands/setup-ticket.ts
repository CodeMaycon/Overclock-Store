import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";
import { createTicketPanelEmbed } from "../utils/embeds";

export const data = new SlashCommandBuilder()
  .setName("setup-ticket")
  .setDescription("Publica o painel oficial de atendimento por tickets da Overclock Store")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.channel || !("send" in interaction.channel)) {
    await interaction.reply({
      content: "Este comando só pode ser executado em canais de texto do servidor.",
      ephemeral: true,
    });
    return;
  }

  const embed = createTicketPanelEmbed();

  const select = new StringSelectMenuBuilder()
    .setCustomId("ticket_category_select")
    .setPlaceholder("Selecione a categoria para abrir o ticket...")
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel("Dúvida Pré-Compra")
        .setDescription("Dúvidas sobre compatibilidade, requisitos e catálogo")
        .setValue("pre_compra")
        .setEmoji("💡"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Suporte Técnico / Instalação")
        .setDescription("Ativação de chave, download, loader e reset de HWID")
        .setValue("suporte_tecnico")
        .setEmoji("🛠️"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Pagamento / Licença")
        .setDescription("Confirmação de Pix, dúvidas sobre pedidos e chaves")
        .setValue("pagamento_licenca")
        .setEmoji("💳")
    );

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

  await interaction.channel.send({
    embeds: [embed],
    components: [row],
  });

  await interaction.reply({
    content: "✅ Painel de tickets publicado com sucesso neste canal!",
    ephemeral: true,
  });
}
