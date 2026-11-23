import {
  ButtonInteraction,
  StringSelectMenuInteraction,
  ModalSubmitInteraction,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  GuildMember,
} from "discord.js";
import { storeApi, BotProduct } from "../services/store-api";
import { createBaseEmbed, COLORS, createErrorEmbed } from "../utils/embeds";

function checkAdminPermission(interaction: ButtonInteraction | StringSelectMenuInteraction | ModalSubmitInteraction): boolean {
  const member = interaction.member as GuildMember | null;
  return !!member?.permissions?.has(PermissionFlagsBits.Administrator);
}

/**
 * 1. Alterar Status — Passo 1: Selecionar o Produto
 */
export async function handleStaffChangeStatusStart(interaction: ButtonInteraction) {
  if (!checkAdminPermission(interaction)) {
    await interaction.reply({
      content: "❌ Acesso negado. Apenas administradores podem utilizar este painel.",
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    const products = await storeApi.getProducts();

    if (products.length === 0) {
      await interaction.editReply({
        content: "❌ Nenhum produto cadastrado no catálogo.",
      });
      return;
    }

    const select = new StringSelectMenuBuilder()
      .setCustomId("select_staff_status_product")
      .setPlaceholder("Selecione o produto para alterar o status...");

    for (const prod of products.slice(0, 25)) {
      select.addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel(prod.name)
          .setDescription(`Status atual: ${prod.status} • Slug: ${prod.slug}`)
          .setValue(prod.slug)
          .setEmoji("⚙️")
      );
    }

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

    await interaction.editReply({
      content: "🔧 **Selecione o produto que deseja alterar o status:**",
      components: [row],
    });
  } catch (err: any) {
    console.error("[STAFF_STATUS_START_ERROR]", err);
    await interaction.editReply({
      content: `❌ Falha ao listar produtos: ${err?.message || "Erro desconhecido"}`,
    });
  }
}

/**
 * 1. Alterar Status — Passo 2: Selecionar o Novo Status
 */
export async function handleStaffStatusProductSelect(interaction: StringSelectMenuInteraction) {
  if (!checkAdminPermission(interaction)) {
    await interaction.reply({
      content: "❌ Acesso negado. Apenas administradores podem utilizar este painel.",
      ephemeral: true,
    });
    return;
  }

  const slug = interaction.values[0];

  const select = new StringSelectMenuBuilder()
    .setCustomId(`select_staff_status_value:${slug}`)
    .setPlaceholder("Selecione o novo status oficial...");

  select.addOptions(
    new StringSelectMenuOptionBuilder()
      .setLabel("🟢 Operacional (ONLINE)")
      .setDescription("Produto em estoque normal, indetectável e liberado para compras.")
      .setValue("ONLINE"),
    new StringSelectMenuOptionBuilder()
      .setLabel("🟡 Em Manutenção (MAINTENANCE)")
      .setDescription("Software em atualização preventiva de bypass/segurança.")
      .setValue("MAINTENANCE"),
    new StringSelectMenuOptionBuilder()
      .setLabel("⚪ Sem Estoque (OUT_OF_STOCK)")
      .setDescription("Aguardando novas chaves de licença no estoque.")
      .setValue("OUT_OF_STOCK"),
    new StringSelectMenuOptionBuilder()
      .setLabel("🔴 Desativado / Oculto (DISABLED)")
      .setDescription("Oculta o produto da vitrine principal da loja.")
      .setValue("DISABLED")
  );

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

  await interaction.update({
    content: `⚙️ **Defina o novo status para o produto \`${slug}\`:**`,
    components: [row],
  });
}

/**
 * 1. Alterar Status — Passo 3: Executar a Atualização
 */
export async function handleStaffStatusValueSelect(interaction: StringSelectMenuInteraction, slug: string) {
  if (!checkAdminPermission(interaction)) {
    await interaction.reply({
      content: "❌ Acesso negado. Apenas administradores podem utilizar este painel.",
      ephemeral: true,
    });
    return;
  }

  const newStatus = interaction.values[0];
  await interaction.deferUpdate();

  try {
    const result = await storeApi.updateProductStatus(slug, newStatus, interaction.user.id);

    const embed = createBaseEmbed(COLORS.PRIMARY)
      .setTitle("✅ Status Atualizado com Sucesso!")
      .setDescription(
        `O status do produto **${result.name}** (\`${result.slug}\`) foi alterado para **${result.status}**.`
      )
      .addFields(
        { name: "Produto", value: result.name, inline: true },
        { name: "Novo Status", value: `\`${result.status}\``, inline: true },
        { name: "Atualizado por", value: `<@${interaction.user.id}>`, inline: true }
      );

    await interaction.editReply({
      content: "",
      embeds: [embed],
      components: [],
    });
  } catch (err: any) {
    console.error("[STAFF_STATUS_UPDATE_ERROR]", err);
    await interaction.editReply({
      content: `❌ Falha ao atualizar status na API: ${err?.message || "Erro desconhecido"}`,
      components: [],
    });
  }
}

/**
 * 2. Repor Estoque — Passo 1: Selecionar Variante
 */
export async function handleStaffAddKeysStart(interaction: ButtonInteraction) {
  if (!checkAdminPermission(interaction)) {
    await interaction.reply({
      content: "❌ Acesso negado. Apenas administradores podem utilizar este painel.",
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    const products = await storeApi.getProducts();
    const select = new StringSelectMenuBuilder()
      .setCustomId("select_staff_stock_variant")
      .setPlaceholder("Selecione a variante para adicionar chaves...");

    const options: StringSelectMenuOptionBuilder[] = [];

    for (const prod of products) {
      for (const variant of prod.variants) {
        if (options.length < 25) {
          options.push(
            new StringSelectMenuOptionBuilder()
              .setLabel(`${prod.name} — ${variant.name}`)
              .setDescription(`${variant.stock} em estoque • ${variant.priceFormatted}`)
              .setValue(variant.id)
              .setEmoji("📦")
          );
        }
      }
    }

    if (options.length === 0) {
      await interaction.editReply({
        content: "❌ Nenhuma variante encontrada no catálogo.",
      });
      return;
    }

    select.addOptions(options);
    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

    await interaction.editReply({
      content: "📥 **Escolha a variante em que deseja adicionar novas chaves:**",
      components: [row],
    });
  } catch (err: any) {
    console.error("[STAFF_ADD_KEYS_START_ERROR]", err);
    await interaction.editReply({
      content: `❌ Falha ao listar variantes: ${err?.message || "Erro desconhecido"}`,
    });
  }
}

/**
 * 2. Repor Estoque — Passo 2: Abrir Modal com Textarea
 */
export async function handleStaffStockVariantSelect(interaction: StringSelectMenuInteraction) {
  if (!checkAdminPermission(interaction)) {
    await interaction.reply({
      content: "❌ Acesso negado. Apenas administradores podem utilizar este painel.",
      ephemeral: true,
    });
    return;
  }

  const variantId = interaction.values[0];

  const modal = new ModalBuilder()
    .setCustomId(`modal_staff_add_keys:${variantId}`)
    .setTitle("Adicionar Chaves ao Estoque");

  const keysInput = new TextInputBuilder()
    .setCustomId("input_staff_keys")
    .setLabel("Cole as chaves (1 por linha):")
    .setPlaceholder("XXXX-YYYY-ZZZZ-1111\nXXXX-YYYY-ZZZZ-2222")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(4000);

  modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(keysInput));

  await interaction.showModal(modal);
}

/**
 * 2. Repor Estoque — Passo 3: Processar Envio das Chaves
 */
export async function handleStaffAddKeysModal(interaction: ModalSubmitInteraction, variantId: string) {
  if (!checkAdminPermission(interaction)) {
    await interaction.reply({
      content: "❌ Acesso negado. Apenas administradores podem utilizar este painel.",
      ephemeral: true,
    });
    return;
  }

  const rawText = interaction.fields.getTextInputValue("input_staff_keys");
  const keys = rawText
    .split("\n")
    .map((k) => k.trim())
    .filter((k) => k.length >= 4);

  if (keys.length === 0) {
    await interaction.reply({
      content: "❌ Nenhuma chave válida encontrada no texto informado.",
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    const result = await storeApi.addStock(variantId, keys, interaction.user.id);

    const embed = createBaseEmbed(COLORS.PRIMARY)
      .setTitle("✅ Chaves Adicionadas com Sucesso!")
      .addFields(
        { name: "Produto / Variante", value: `${result.productName} (${result.variantName})`, inline: true },
        { name: "Novas Chaves Inseridas", value: `+${result.addedCount}`, inline: true },
        { name: "Duplicadas Ignoradas", value: `${result.skippedCount}`, inline: true },
        { name: "Estoque Total Atual", value: `\`${result.currentStock} chaves disponíveis\``, inline: false }
      );

    await interaction.editReply({
      embeds: [embed],
    });
  } catch (err: any) {
    console.error("[STAFF_ADD_KEYS_MODAL_ERROR]", err);
    await interaction.editReply({
      content: `❌ Falha ao inserir chaves: ${err?.message || "Erro interno"}`,
    });
  }
}

/**
 * 3. Resumo de Vendas
 */
export async function handleStaffSalesSummary(interaction: ButtonInteraction) {
  if (!checkAdminPermission(interaction)) {
    await interaction.reply({
      content: "❌ Acesso negado. Apenas administradores podem utilizar este painel.",
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    const summary = await storeApi.getAdminSummary();

    const embed = createBaseEmbed(COLORS.PRIMARY)
      .setTitle("📊 Resumo Operacional — Overclock Store")
      .setDescription("Métricas consolidadas de pedidos e faturamento Pix em tempo real:")
      .addFields(
        {
          name: "📅 Hoje (Brasília)",
          value: `**${summary.today.count}** vendas concluídas\n**${summary.today.totalFormatted}** faturados`,
          inline: true,
        },
        {
          name: "🗓️ Últimos 7 Dias",
          value: `**${summary.last7Days.count}** vendas concluídas\n**${summary.last7Days.totalFormatted}** faturados`,
          inline: true,
        },
        {
          name: "📆 Últimos 30 Dias",
          value: `**${summary.last30Days.count}** vendas concluídas\n**${summary.last30Days.totalFormatted}** faturados`,
          inline: true,
        },
        {
          name: "⏳ Pedidos Pendentes",
          value: `**${summary.pendingOrdersCount}** pedido(s) Pix aguardando pagamento`,
          inline: false,
        }
      );

    if (summary.lowStockVariants.length > 0) {
      const lowStockLines = summary.lowStockVariants.slice(0, 10).map((v) => {
        const icon = v.isZeroStock ? "🔴" : "🟡";
        return `${icon} **${v.productName}** (${v.variantName}) — \`${v.stock} em estoque\``;
      });

      embed.addFields({
        name: "⚠️ Alerta de Estoque Baixo / Esgotado",
        value: lowStockLines.join("\n"),
        inline: false,
      });
    } else {
      embed.addFields({
        name: "📦 Estoque",
        value: "🟢 Todas as variantes ativas contam com estoque saudável.",
        inline: false,
      });
    }

    await interaction.editReply({
      embeds: [embed],
    });
  } catch (err: any) {
    console.error("[STAFF_SUMMARY_ERROR]", err);
    await interaction.editReply({
      content: `❌ Falha ao obter resumo: ${err?.message || "Erro desconhecido"}`,
    });
  }
}

/**
 * 4. Ver Mapa de Estoque
 */
export async function handleStaffViewStock(interaction: ButtonInteraction) {
  if (!checkAdminPermission(interaction)) {
    await interaction.reply({
      content: "❌ Acesso negado. Apenas administradores podem utilizar este painel.",
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    const products = await storeApi.getProducts();

    const embed = createBaseEmbed(COLORS.PRIMARY)
      .setTitle("📦 Mapa Geral de Estoque — Overclock Store")
      .setDescription("Disponibilidade real de chaves não atribuídas (`UNASSIGNED`) por variante:");

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

    await interaction.editReply({
      embeds: [embed],
    });
  } catch (err: any) {
    console.error("[STAFF_VIEW_STOCK_ERROR]", err);
    await interaction.editReply({
      content: `❌ Falha ao consultar estoque: ${err?.message || "Erro desconhecido"}`,
    });
  }
}
