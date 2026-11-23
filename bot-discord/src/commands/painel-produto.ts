import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
import { storeApi, BotProduct } from "../services/store-api";
import { createBaseEmbed, COLORS } from "../utils/embeds";

export function formatProductEmbed(product: BotProduct): EmbedBuilder {
  const hasStock = product.variants.some((v) => v.stock > 0);
  const embed = createBaseEmbed(hasStock ? COLORS.PRIMARY : COLORS.WARNING)
    .setTitle(`⚡ ${product.name}`)
    .setDescription(
      product.shortDescription || "Software gamer de alta performance com entrega automática."
    );

  const statusLabel =
    product.status === "ACTIVE"
      ? "🟢 Operacional & Indetectável"
      : product.status === "MAINTENANCE"
      ? "🟡 Em Manutenção Preventiva"
      : "🔴 Indisponível";

  embed.addFields(
    {
      name: "📡 Status Oficial",
      value: statusLabel,
      inline: true,
    },
    {
      name: "📁 Categoria",
      value: product.category?.name || "Geral",
      inline: true,
    }
  );

  if (product.variants.length > 0) {
    const variantLines = product.variants.map((v) => {
      const stockBadge =
        v.stock > 0
          ? `\`${v.stock} em estoque\``
          : `\`Esgotado\``;
      const statusIcon = v.stock > 0 ? "🟢" : "🔴";
      return `${statusIcon} **${v.name}** — **${v.priceFormatted}** (${stockBadge})`;
    });

    embed.addFields({
      name: "📦 Opções & Planos Disponíveis",
      value: variantLines.join("\n"),
      inline: false,
    });
  } else {
    embed.addFields({
      name: "📦 Opções & Planos",
      value: "Nenhum plano disponível no momento.",
      inline: false,
    });
  }

  embed.addFields({
    name: "⚡ Entrega Imediata via Pix",
    value: "Clique em **Comprar via Pix** para selecionar sua variante e receber a chave e as instruções de ativação diretamente no Discord.",
    inline: false,
  });

  return embed;
}

export function buildProductActionRow(slug: string): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`btn_buy_pix:${slug}`)
      .setLabel("Comprar via Pix")
      .setStyle(ButtonStyle.Success)
      .setEmoji("⚡"),
    new ButtonBuilder()
      .setCustomId(`btn_refresh_stock:${slug}`)
      .setLabel("Atualizar Estoque")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("🔄")
  );
}

export const data = new SlashCommandBuilder()
  .setName("painel-produto")
  .setDescription("Publica o card interativo de compra e estoque de um produto da Overclock Store")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addStringOption((opt) =>
    opt
      .setName("slug")
      .setDescription("Slug do produto cadastrado na Overclock Store")
      .setRequired(true)
      .setAutocomplete(true)
  );

export async function autocomplete(interaction: AutocompleteInteraction) {
  try {
    const focusedValue = interaction.options.getFocused().toLowerCase().trim();
    const products = await storeApi.getProducts();

    const filtered = products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(focusedValue) ||
          p.slug.toLowerCase().includes(focusedValue)
      )
      .slice(0, 25);

    await interaction.respond(
      filtered.map((p) => ({
        name: `${p.name} (${p.slug})`,
        value: p.slug,
      }))
    );
  } catch (error) {
    console.error("[AUTOCOMPLETE_ERROR]", error);
    await interaction.respond([]);
  }
}

export async function execute(interaction: ChatInputCommandInteraction) {
  const slug = interaction.options.getString("slug", true);

  await interaction.deferReply({ ephemeral: true });

  try {
    const product = await storeApi.getProductBySlug(slug);

    if (!product) {
      await interaction.editReply({
        content: `❌ Produto com slug \`${slug}\` não foi encontrado ou está desativado no catálogo.`,
      });
      return;
    }

    if (!interaction.channel || !("send" in interaction.channel)) {
      await interaction.editReply({
        content: "❌ Este comando só pode ser executado em canais de texto do servidor.",
      });
      return;
    }

    const embed = formatProductEmbed(product);
    const row = buildProductActionRow(product.slug);

    await interaction.channel.send({
      embeds: [embed],
      components: [row],
    });

    await interaction.editReply({
      content: `✅ Card de venda de **${product.name}** publicado com sucesso neste canal!`,
    });
  } catch (error: any) {
    console.error("[PAINEL_PRODUTO_ERROR]", error);
    await interaction.editReply({
      content: `❌ Erro ao buscar produto na API: ${error?.message || "Erro desconhecido"}`,
    });
  }
}
