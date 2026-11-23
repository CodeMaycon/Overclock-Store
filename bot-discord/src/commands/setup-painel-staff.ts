import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { createBaseEmbed, COLORS } from "../utils/embeds";

export const data = new SlashCommandBuilder()
  .setName("setup-painel-staff")
  .setDescription("Publica o painel de controle administrativo da staff no canal privado")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.channel || !("send" in interaction.channel)) {
    await interaction.reply({
      content: "Este comando só pode ser executado em canais de texto do servidor.",
      ephemeral: true,
    });
    return;
  }

  const embed = createBaseEmbed(COLORS.PRIMARY)
    .setTitle("🛠️ Painel Administrativo — Overclock Store")
    .setDescription(
      "Central de operações rápidas para a equipe de administração da Overclock Store.\n\n" +
      "Selecione uma ação abaixo para gerenciar o catálogo, estoque de licenças ou métricas operacionais sem precisar acessar o navegador."
    )
    .addFields(
      {
        name: "🔄 Alterar Status",
        value: "Alterne o status de qualquer produto (Online, Manutenção, Sem Estoque ou Oculto).",
        inline: true,
      },
      {
        name: "📥 Repor Estoque",
        value: "Importe novas chaves em lote com verificação automática de duplicatas.",
        inline: true,
      },
      {
        name: "📊 Resumo de Vendas",
        value: "Visualize métricas de vendas e faturamento de Hoje, 7 dias e 30 dias.",
        inline: true,
      },
      {
        name: "📦 Ver Estoque",
        value: "Mapa completo de disponibilidade e alertas de estoque baixo.",
        inline: true,
      }
    );

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("btn_staff_change_status")
      .setLabel("Alterar Status")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("🔄"),
    new ButtonBuilder()
      .setCustomId("btn_staff_add_keys")
      .setLabel("Repor Estoque (Keys)")
      .setStyle(ButtonStyle.Success)
      .setEmoji("📥"),
    new ButtonBuilder()
      .setCustomId("btn_staff_sales_summary")
      .setLabel("Resumo de Vendas")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("📊"),
    new ButtonBuilder()
      .setCustomId("btn_staff_view_stock")
      .setLabel("Ver Estoque")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("📦")
  );

  await interaction.channel.send({
    embeds: [embed],
    components: [row],
  });

  await interaction.reply({
    content: "✅ Painel administrativo publicado com sucesso neste canal!",
    ephemeral: true,
  });
}
