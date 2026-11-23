import {
  StringSelectMenuInteraction,
  ButtonInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { storeApi } from "../services/store-api";
import { formatProductEmbed } from "../commands/painel-produto";
import { buildStoreDrawerEmbed, buildStoreDrawerComponents } from "../commands/setup-loja";

/**
 * Trata a seleção de um produto na gaveta do catálogo
 */
export async function handleStoreDrawerSelect(interaction: StringSelectMenuInteraction) {
  const slug = interaction.values[0];
  if (!slug || slug === "none") return;

  await interaction.deferReply({ ephemeral: true });

  try {
    const product = await storeApi.getProductBySlug(slug);

    if (!product) {
      await interaction.editReply({
        content: `❌ Produto com slug \`${slug}\` não foi encontrado ou está desativado.`,
      });
      return;
    }

    const embed = formatProductEmbed(product);
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`btn_buy_pix:${product.slug}`)
        .setLabel("Comprar via Pix")
        .setStyle(ButtonStyle.Success)
        .setEmoji("⚡"),
      new ButtonBuilder()
        .setCustomId(`btn_refresh_stock:${product.slug}`)
        .setLabel("Atualizar Estoque")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("🔄")
    );

    await interaction.editReply({
      embeds: [embed],
      components: [row],
    });
  } catch (error: any) {
    console.error("[DRAWER_SELECT_ERROR]", error);
    await interaction.editReply({
      content: `❌ Erro ao carregar informações do produto: ${error?.message || "Erro desconhecido"}`,
    });
  }
}

/**
 * Trata o clique no botão "Atualizar Catálogo" na mensagem da gaveta
 */
export async function handleRefreshStoreCatalog(interaction: ButtonInteraction) {
  await interaction.deferUpdate();

  try {
    const products = await storeApi.getProducts();
    const embed = buildStoreDrawerEmbed();
    const components = buildStoreDrawerComponents(products);

    await interaction.editReply({
      embeds: [embed],
      components,
    });

    await interaction.followUp({
      content: "✅ Catálogo atualizado com os produtos e estoques mais recentes!",
      ephemeral: true,
    });
  } catch (error: any) {
    console.error("[REFRESH_CATALOG_ERROR]", error);
    await interaction.followUp({
      content: `❌ Falha ao atualizar catálogo: ${error?.message || "Erro de conexão"}`,
      ephemeral: true,
    });
  }
}
