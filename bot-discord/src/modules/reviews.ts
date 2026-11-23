import {
  ButtonInteraction,
  ModalSubmitInteraction,
  PermissionFlagsBits,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  TextChannel,
  GuildMember,
} from "discord.js";
import { config } from "../config";
import { createBaseEmbed, COLORS } from "../utils/embeds";

/**
 * Trata o clique no botão "Avaliar Compra"
 */
export async function handleOpenReviewModal(interaction: ButtonInteraction, targetChannelId: string) {
  const member = interaction.member as GuildMember | null;
  const isAdmin = member?.permissions?.has(PermissionFlagsBits.Administrator);
  const isCustomer =
    config.discord.customerRoleId &&
    member?.roles?.cache?.has(config.discord.customerRoleId);

  if (!isAdmin && !isCustomer) {
    await interaction.reply({
      content:
        "❌ **Acesso Restrito:** Apenas clientes com o cargo oficial de Cliente podem enviar avaliações.\n" +
        "Realize sua primeira compra na loja ou pelo bot para liberar sua avaliação!",
      ephemeral: true,
    });
    return;
  }

  const modal = new ModalBuilder()
    .setCustomId(`modal_submit_review:${targetChannelId}`)
    .setTitle("Avaliar Compra — Overclock Store");

  const ratingInput = new TextInputBuilder()
    .setCustomId("input_review_rating")
    .setLabel("Sua Nota (digite um número de 1 a 5):")
    .setPlaceholder("5")
    .setStyle(TextInputStyle.Short)
    .setMinLength(1)
    .setMaxLength(1)
    .setRequired(true);

  const productInput = new TextInputBuilder()
    .setCustomId("input_review_product")
    .setLabel("Qual produto você comprou?")
    .setPlaceholder("Ex: Oxine Spoofer, Software Pro Gamer...")
    .setStyle(TextInputStyle.Short)
    .setMinLength(2)
    .setMaxLength(60)
    .setRequired(true);

  const commentInput = new TextInputBuilder()
    .setCustomId("input_review_comment")
    .setLabel("Comentário sobre sua experiência:")
    .setPlaceholder("Conte o que achou da velocidade de entrega, suporte e funcionamento...")
    .setStyle(TextInputStyle.Paragraph)
    .setMinLength(5)
    .setMaxLength(1000)
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(ratingInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(productInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(commentInput)
  );

  await interaction.showModal(modal);
}

/**
 * Trata o envio do modal de avaliação
 */
export async function handleSubmitReviewModal(interaction: ModalSubmitInteraction) {
  const targetChannelId = interaction.customId.split(":")[1];
  const ratingStr = interaction.fields.getTextInputValue("input_review_rating").trim();
  const product = interaction.fields.getTextInputValue("input_review_product").trim();
  const comment = interaction.fields.getTextInputValue("input_review_comment").trim();

  const score = parseInt(ratingStr, 10);
  if (isNaN(score) || score < 1 || score > 5) {
    await interaction.reply({
      content: "❌ Nota inválida! Por favor, informe um número inteiro entre **1 e 5**.",
      ephemeral: true,
    });
    return;
  }

  const channel = interaction.guild?.channels.cache.get(targetChannelId) as TextChannel | undefined;

  if (!channel || !("send" in channel)) {
    await interaction.reply({
      content: "❌ Canal de destino das avaliações não foi encontrado.",
      ephemeral: true,
    });
    return;
  }

  const stars = "⭐".repeat(score);
  const user = interaction.user;

  const reviewEmbed = createBaseEmbed(COLORS.PRIMARY)
    .setTitle(`${stars} • Avaliação de Compra Verificada`)
    .setDescription(`"${comment}"`)
    .setAuthor({
      name: `@${user.username} (Cliente Verificado)`,
      iconURL: user.displayAvatarURL(),
    })
    .addFields(
      { name: "🛍️ Produto Adquirido", value: `**${product}**`, inline: true },
      { name: "⭐ Classificação", value: `${score} / 5 estrelas`, inline: true },
      {
        name: "📅 Data da Avaliação",
        value: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
        inline: true,
      }
    );

  await channel.send({
    embeds: [reviewEmbed],
  });

  await interaction.reply({
    content: `✅ Muito obrigado pelo seu feedback! Sua avaliação foi publicada com sucesso em <#${channel.id}>.`,
    ephemeral: true,
  });
}
