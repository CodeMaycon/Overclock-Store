import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ModalSubmitInteraction,
  PermissionFlagsBits,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelType,
  TextChannel,
} from "discord.js";
import { createBaseEmbed, COLORS } from "../utils/embeds";

export const data = new SlashCommandBuilder()
  .setName("anunciar")
  .setDescription("Abre o formulário de anúncio oficial formatado no padrão da Overclock Store")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addStringOption((opt) =>
    opt
      .setName("mencao")
      .setDescription("Selecione a menção para o anúncio")
      .setRequired(false)
      .addChoices(
        { name: "Nenhuma menção", value: "none" },
        { name: "@here", value: "here" },
        { name: "@everyone", value: "everyone" }
      )
  )
  .addChannelOption((opt) =>
    opt
      .setName("canal")
      .setDescription("Canal onde o anúncio será enviado (padrão: canal atual)")
      .setRequired(false)
      .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const mencao = interaction.options.getString("mencao") || "none";
  const targetChannel = interaction.options.getChannel("canal") || interaction.channel;

  if (!targetChannel || !("send" in targetChannel)) {
    await interaction.reply({
      content: "Canal inválido para envio do anúncio.",
      ephemeral: true,
    });
    return;
  }

  const modal = new ModalBuilder()
    .setCustomId(`modal_anuncio:${mencao}:${targetChannel.id}`)
    .setTitle("Publicar Anúncio Oficial");

  const titleInput = new TextInputBuilder()
    .setCustomId("input_anuncio_titulo")
    .setLabel("Título do Anúncio:")
    .setPlaceholder("Ex: ⚡ Atualização Importante de Segurança")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(100);

  const contentInput = new TextInputBuilder()
    .setCustomId("input_anuncio_conteudo")
    .setLabel("Mensagem:")
    .setPlaceholder("Escreva aqui o conteúdo do comunicado...")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(3500);

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(titleInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(contentInput)
  );

  await interaction.showModal(modal);
}

export async function handleAnuncioModal(interaction: ModalSubmitInteraction) {
  const parts = interaction.customId.split(":");
  const mencao = parts[1];
  const targetChannelId = parts[2];

  const title = interaction.fields.getTextInputValue("input_anuncio_titulo").trim();
  const content = interaction.fields.getTextInputValue("input_anuncio_conteudo").trim();

  const channel = interaction.guild?.channels.cache.get(targetChannelId) as TextChannel | undefined;

  if (!channel || !("send" in channel)) {
    await interaction.reply({
      content: "❌ Canal de destino não encontrado ou sem permissão de envio.",
      ephemeral: true,
    });
    return;
  }

  const embed = createBaseEmbed(COLORS.PRIMARY)
    .setTitle(`📢 ${title}`)
    .setDescription(content)
    .setAuthor({
      name: `Comunicado Oficial — ${interaction.guild?.name || "Overclock Store"}`,
      iconURL: interaction.guild?.iconURL() || undefined,
    });

  let mentionText = "";
  if (mencao === "here") mentionText = "@here";
  else if (mencao === "everyone") mentionText = "@everyone";

  await channel.send({
    content: mentionText || undefined,
    embeds: [embed],
  });

  await interaction.reply({
    content: `✅ Anúncio publicado com sucesso em <#${channel.id}>!`,
    ephemeral: true,
  });
}
