import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";
import { storeApi, BotProduct } from "../services/store-api";
import { createBaseEmbed, COLORS } from "../utils/embeds";

export function buildStoreDrawerEmbed(): any {
  return createBaseEmbed(COLORS.PRIMARY)
    .setTitle("🛒 Catálogo Oficial — Overclock Store")
    .setDescription(
      "Seja bem-vindo à loja oficial da **Overclock Store**!\n\n" +
      "Nossos softwares contam com tecnologia de ponta, bypass indetectável, atualizações frequentes e **entrega 100% automatizada via Pix** direto no Discord e na Área do Cliente.\n\n" +
      "👇 **Selecione um produto no menu abaixo para ver planos, preços e estoque:**"
    )
    .setImage("https://overclockstore.com.br/icon.png")
    .addFields(
      {
        name: "⚡ Entrega Automática",
        value: "Chave liberada no chat e no painel instantaneamente após o Pix.",
        inline: true,
      },
      {
        name: "🛡️ Suporte Especializado",
        value: "Equipe técnica dedicada via Tickets 7 dias por semana.",
        inline: true,
      }
    );
}

export function buildStoreDrawerComponents(products: BotProduct[]): any[] {
  const activeProducts = products.filter((p) => p.status !== "DISABLED");

  const select = new StringSelectMenuBuilder()
    .setCustomId("select_store_drawer_product")
    .setPlaceholder(
      activeProducts.length > 0
        ? "Selecione um produto para ver detalhes e comprar..."
        : "Nenhum produto disponível no momento"
    );

  if (activeProducts.length === 0) {
    select.addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel("Nenhum produto disponível")
        .setValue("none")
        .setDescription("Catálogo em atualização")
    );
    select.setDisabled(true);
  } else {
    for (const prod of activeProducts) {
      const minPrice =
        prod.variants.length > 0
          ? Math.min(...prod.variants.map((v) => v.price))
          : 0;
      const minPriceFormatted = `R$ ${minPrice.toFixed(2).replace(".", ",")}`;
      const statusIcon = prod.status === "ONLINE" ? "🟢" : prod.status === "MAINTENANCE" ? "🟡" : "🔴";

      select.addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel(prod.name)
          .setDescription(`${statusIcon} A partir de ${minPriceFormatted} • ${prod.category?.name || "Software"}`)
          .setValue(prod.slug)
          .setEmoji("⚡")
      );
    }
  }

  const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

  const btnRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("btn_refresh_store_catalog")
      .setLabel("Atualizar Catálogo")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("🔄")
  );

  return [selectRow, btnRow];
}

export const data = new SlashCommandBuilder()
  .setName("setup-loja")
  .setDescription("Publica o catálogo interativo em gaveta da Overclock Store")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.channel || !("send" in interaction.channel)) {
    await interaction.reply({
      content: "Este comando só pode ser executado em canais de texto do servidor.",
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    const products = await storeApi.getProducts();
    const embed = buildStoreDrawerEmbed();
    const components = buildStoreDrawerComponents(products);

    await interaction.channel.send({
      embeds: [embed],
      components,
    });

    await interaction.editReply({
      content: "✅ Catálogo unificado em gaveta publicado com sucesso neste canal!",
    });
  } catch (error: any) {
    console.error("[SETUP_LOJA_ERROR]", error);
    await interaction.editReply({
      content: `❌ Erro ao publicar catálogo: ${error?.message || "Erro desconhecido"}`,
    });
  }
}
