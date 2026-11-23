import {
  ButtonInteraction,
  StringSelectMenuInteraction,
  ModalSubmitInteraction,
  ChannelType,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  AttachmentBuilder,
  TextChannel,
  GuildMember,
} from "discord.js";
import { config } from "../config";
import { storeApi, BotProduct } from "../services/store-api";
import { createBaseEmbed, COLORS, createErrorEmbed, createSuccessEmbed } from "../utils/embeds";
import { formatProductEmbed, buildProductActionRow } from "../commands/painel-produto";

interface ActiveCartSession {
  orderId: string;
  orderNumber: string;
  userId: string;
  channelId: string;
  pixCode: string;
  expiresAt: number;
  interval?: NodeJS.Timeout;
}

// Map de sessões de carrinho ativas para controle de polling sem memory leaks
const activeCarts = new Map<string, ActiveCartSession>();

/**
 * Atualiza o card de produto e estoque no canal
 */
export async function handleRefreshStock(interaction: ButtonInteraction, slug: string) {
  await interaction.deferUpdate();

  try {
    const product = await storeApi.getProductBySlug(slug);
    if (!product) {
      await interaction.followUp({
        content: `❌ Produto \`${slug}\` não foi encontrado no catálogo.`,
        ephemeral: true,
      });
      return;
    }

    const embed = formatProductEmbed(product);
    const row = buildProductActionRow(product.slug);

    await interaction.editReply({
      embeds: [embed],
      components: [row],
    });

    await interaction.followUp({
      content: `✅ Estoque e informações de **${product.name}** atualizados com sucesso!`,
      ephemeral: true,
    });
  } catch (error: any) {
    console.error("[REFRESH_STOCK_ERROR]", error);
    await interaction.followUp({
      content: `❌ Falha ao atualizar estoque: ${error?.message || "Erro de conexão"}`,
      ephemeral: true,
    });
  }
}

/**
 * Inicia o fluxo de compra ao clicar em "Comprar via Pix"
 */
export async function handleBuyPixStart(interaction: ButtonInteraction, slug: string) {
  await interaction.deferReply({ ephemeral: true });

  try {
    const product = await storeApi.getProductBySlug(slug);
    if (!product) {
      await interaction.editReply({
        content: `❌ Produto \`${slug}\` não encontrado no catálogo.`,
      });
      return;
    }

    const availableVariants = product.variants.filter((v) => v.stock > 0);

    if (availableVariants.length === 0) {
      await interaction.editReply({
        content: `❌ Todas as variantes de **${product.name}** estão esgotadas no momento. Acompanhe os avisos no servidor para novidades de reposição!`,
      });
      return;
    }

    const select = new StringSelectMenuBuilder()
      .setCustomId(`select_buy_variant:${slug}`)
      .setPlaceholder("Selecione o plano desejado...");

    for (const v of availableVariants) {
      select.addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel(v.name)
          .setDescription(`${v.priceFormatted} • ${v.stock} chave(s) em estoque`)
          .setValue(v.id)
          .setEmoji("⚡")
      );
    }

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

    await interaction.editReply({
      content: `🛒 **Escolha a variante de ${product.name} para gerar o Pix:**`,
      components: [row],
    });
  } catch (error: any) {
    console.error("[BUY_PIX_START_ERROR]", error);
    await interaction.editReply({
      content: `❌ Erro ao consultar estoque: ${error?.message || "Erro interno"}`,
    });
  }
}

/**
 * Trata a seleção da variante no menu de compra
 */
export async function handleVariantSelect(interaction: StringSelectMenuInteraction, slug: string) {
  const variantId = interaction.values[0];
  const user = interaction.user;

  try {
    // 1. Verifica se o usuário já está vinculado
    const userData = await storeApi.getUserByDiscordId(user.id);

    if (userData.linked && userData.user?.email) {
      // Usuário já possui conta vinculada com e-mail confirmado, cria direto o carrinho
      await createCartChannelAndOrder(interaction, {
        slug,
        variantId,
        userEmail: userData.user.email,
        isModal: false,
      });
    } else {
      // Usuário não vinculado: abre modal pedindo e-mail para recibo e entrega
      const modal = new ModalBuilder()
        .setCustomId(`modal_cart_email:${slug}:${variantId}`)
        .setTitle("E-mail para Recebimento da Licença");

      const emailInput = new TextInputBuilder()
        .setCustomId("input_buyer_email")
        .setLabel("Seu melhor e-mail:")
        .setPlaceholder("exemplo: seu_email@gmail.com")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMinLength(5)
        .setMaxLength(100);

      const row = new ActionRowBuilder<TextInputBuilder>().addComponents(emailInput);
      modal.addComponents(row);

      await interaction.showModal(modal);
    }
  } catch (err: any) {
    console.error("[VARIANT_SELECT_ERROR]", err);
    await interaction.reply({
      content: `❌ Falha ao processar seleção: ${err?.message || "Erro interno"}`,
      ephemeral: true,
    });
  }
}

/**
 * Trata o envio do e-mail pelo modal
 */
export async function handleCartEmailModal(
  interaction: ModalSubmitInteraction,
  slug: string,
  variantId: string
) {
  const email = interaction.fields.getTextInputValue("input_buyer_email").trim();

  if (!email.includes("@") || !email.includes(".")) {
    await interaction.reply({
      content: "❌ Por favor, informe um endereço de e-mail válido para vincular à sua compra.",
      ephemeral: true,
    });
    return;
  }

  await createCartChannelAndOrder(interaction, {
    slug,
    variantId,
    userEmail: email,
    isModal: true,
  });
}

/**
 * Cria o canal privado de carrinho e inicializa a cobrança Pix com polling
 */
async function createCartChannelAndOrder(
  interaction: StringSelectMenuInteraction | ModalSubmitInteraction,
  params: { slug: string; variantId: string; userEmail: string; isModal: boolean }
) {
  const { variantId, userEmail, isModal } = params;
  const user = interaction.user;
  const guild = interaction.guild;

  if (!guild) {
    const replyFn = isModal ? interaction.reply.bind(interaction) : interaction.editReply.bind(interaction);
    await replyFn({ content: "Comando disponível apenas em servidores." });
    return;
  }

  if (isModal) {
    await interaction.deferReply({ ephemeral: true });
  } else {
    await interaction.deferUpdate();
  }

  try {
    // 1. Verifica se já existe um carrinho aberto para este usuário
    const existingChannel = guild.channels.cache.find((ch) => {
      if (ch.type !== ChannelType.GuildText) return false;
      const textCh = ch as TextChannel;
      return (
        textCh.topic?.includes(`cart-user:${user.id}`) &&
        (!config.discord.cartCategoryId || textCh.parentId === config.discord.cartCategoryId)
      );
    });

    if (existingChannel) {
      await interaction.followUp({
        content: `⚠️ Você já possui um carrinho aberto em <#${existingChannel.id}>. Conclua ou cancele o pedido anterior antes de abrir um novo.`,
        ephemeral: true,
      });
      return;
    }

    // 2. Prepara permissões do canal de carrinho
    const permissionOverwrites: any[] = [
      {
        id: guild.id,
        deny: [PermissionFlagsBits.ViewChannel],
      },
      {
        id: user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.EmbedLinks,
        ],
      },
      {
        id: guild.client.user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ManageChannels,
          PermissionFlagsBits.EmbedLinks,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.ReadMessageHistory,
        ],
      },
    ];

    if (config.discord.supportRoleId) {
      permissionOverwrites.push({
        id: config.discord.supportRoleId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.EmbedLinks,
        ],
      });
    }

    const cleanUsername = user.username.toLowerCase().replace(/[^a-z0-9_-]/g, "");
    const channelName = `carrinho-${cleanUsername || user.id.slice(-4)}`;

    const channel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: config.discord.cartCategoryId || undefined,
      topic: `cart-user:${user.id} | Pedido Pix em aberto`,
      permissionOverwrites,
    });

    // 3. Cria o pedido na API da loja
    const order = await storeApi.createOrder({
      discordId: user.id,
      discordUsername: user.username,
      variantId,
      email: userEmail,
    });

    // 4. Converte a imagem do QR Code Base64 em Attachment
    const cleanBase64 = order.pixQrCodeBase64.replace(/^data:image\/[a-z]+;base64,/, "");
    const qrBuffer = Buffer.from(cleanBase64, "base64");
    const qrAttachment = new AttachmentBuilder(qrBuffer, { name: "pix-qrcode.png" });

    // 5. Monta embed do Pix
    const cartEmbed = createBaseEmbed(COLORS.PRIMARY)
      .setTitle(`🛒 Pedido Reservado — #${order.orderNumber}`)
      .setDescription(
        `Olá <@${user.id}>! Sua chave foi reservada por **30 minutos** no estoque.\n\n` +
        `**Valor:** \`${order.amountFormatted}\`\n` +
        `**E-mail vinculado:** \`${userEmail}\`\n\n` +
        `**Instruções de Pagamento:**\n` +
        `1. Abra o aplicativo do seu banco.\n` +
        `2. Selecione a opção **Pix > Ler QR Code** ou aponte a câmera para a imagem abaixo.\n` +
        `3. Ou clique em **Copiar Código Pix** para copiar o código Copia e Cola.\n` +
        `4. Assim que o Pix for aprovado, sua licença será liberada automaticamente aqui!`
      )
      .setImage("attachment://pix-qrcode.png")
      .addFields({
        name: "⏳ Expiração",
        value: "O pedido e a reserva expiram em 30 minutos.",
        inline: false,
      });

    const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`btn_copy_pix:${order.orderId}`)
        .setLabel("Copiar Código Pix")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("📋"),
      new ButtonBuilder()
        .setCustomId(`btn_cancel_cart:${order.orderId}`)
        .setLabel("Cancelar Carrinho")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("❌")
    );

    const message = await channel.send({
      content: `<@${user.id}>`,
      embeds: [cartEmbed],
      files: [qrAttachment],
      components: [actionRow],
    });

    await interaction.followUp({
      content: `✅ Carrinho criado com sucesso! Acesse <#${channel.id}> para concluir seu Pix.`,
      ephemeral: true,
    });

    // 6. Inicia o Polling de confirmação a cada 7 segundos (limite de 31 minutos)
    const expiresAtTimestamp = new Date(order.expiresAt).getTime();
    const session: ActiveCartSession = {
      orderId: order.orderId,
      orderNumber: order.orderNumber,
      userId: user.id,
      channelId: channel.id,
      pixCode: order.pixQrCode,
      expiresAt: expiresAtTimestamp,
    };

    activeCarts.set(order.orderId, session);
    startOrderPolling(session, channel, guild);
  } catch (err: any) {
    console.error("[CREATE_CART_ORDER_ERROR]", err);
    await interaction.followUp({
      content: `❌ Falha ao abrir carrinho: ${err?.message || "Erro desconhecido"}`,
      ephemeral: true,
    });
  }
}

/**
 * Loop leve de polling de pagamento a cada 7 segundos
 */
function startOrderPolling(session: ActiveCartSession, channel: TextChannel, guild: any) {
  const pollInterval = setInterval(async () => {
    try {
      // Se o canal já foi deletado ou a sessão removida, encerra
      if (!activeCarts.has(session.orderId)) {
        clearInterval(pollInterval);
        return;
      }

      // Verifica timeout (31 minutos)
      if (Date.now() > session.expiresAt + 60 * 1000) {
        clearInterval(pollInterval);
        activeCarts.delete(session.orderId);
        await channel.send({
          content: `⏳ <@${session.userId}> **O tempo de reserva do Pix expirou.** O canal será encerrado em 15 segundos.`,
        }).catch(() => {});
        setTimeout(() => channel.delete("Reserva expirada.").catch(() => {}), 15000);
        return;
      }

      const orderData = await storeApi.getOrder(session.orderId);

      if (orderData.status === "COMPLETED") {
        // Sucesso! Encerra o polling imediatamente
        clearInterval(pollInterval);
        activeCarts.delete(session.orderId);

        const lic = orderData.license;
        const keyDisplay = lic?.licenseKey || "Chave processada no Dashboard";

        const successEmbed = createBaseEmbed(COLORS.PRIMARY)
          .setTitle("🎉 Pagamento Confirmado com Sucesso!")
          .setDescription(
            `Obrigado pela sua compra na **Overclock Store**!\n\n` +
            `**Produto:** ${lic?.productName || "Software"}\n` +
            `**Plano:** ${lic?.variantName || "Licença"}\n` +
            `**Pedido:** \`#${orderData.orderNumber}\`\n\n` +
            `🔑 **Sua Chave de Acesso:**\n\`\`\`\n${keyDisplay}\n\`\`\`\n` +
            `📖 **Instruções de Uso & Ativação:**\n${lic?.instructions || "Ative sua chave no dashboard."}\n\n` +
            `*Copie sua chave de licença acima antes de fechar o canal.*`
          );

        const closeRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`btn_finish_cart:${session.orderId}`)
            .setLabel("Concluir e Fechar Carrinho")
            .setStyle(ButtonStyle.Success)
            .setEmoji("✅")
        );

        await channel.send({
          content: `⚡ <@${session.userId}> **SEU PAGAMENTO FOI APROVADO!**`,
          embeds: [successEmbed],
          components: [closeRow],
        });

        // 1. Tenta enviar cópia na DM do comprador
        try {
          const buyer = await guild.client.users.fetch(session.userId);
          if (buyer) {
            await buyer.send({
              embeds: [successEmbed],
            });
          }
        } catch (dmErr) {
          // DM fechada pelo usuário, não quebra o fluxo
        }

        // 2. Tenta atribuir cargo de cliente
        if (config.discord.customerRoleId) {
          try {
            const member = await guild.members.fetch(session.userId);
            if (member && !member.roles.cache.has(config.discord.customerRoleId)) {
              await member.roles.add(config.discord.customerRoleId, "Compra aprovada na Overclock Store");
            }
          } catch (roleErr) {
            console.error("[ASSIGN_CUSTOMER_ROLE_ERROR]", roleErr);
          }
        }

        // 3. Log da venda no canal de auditoria (NUNCA expor a chave aqui)
        if (config.discord.salesLogsChannelId) {
          try {
            const salesLogChannel = guild.channels.cache.get(
              config.discord.salesLogsChannelId
            ) as TextChannel | undefined;

            if (salesLogChannel && salesLogChannel.isTextBased()) {
              const logEmbed = createBaseEmbed(COLORS.PRIMARY)
                .setTitle("💰 Nova Venda Concluída (Discord)")
                .addFields(
                  { name: "Comprador", value: `<@${session.userId}> (\`${session.userId}\`)`, inline: true },
                  { name: "Pedido", value: `\`#${orderData.orderNumber}\``, inline: true },
                  { name: "Produto / Plano", value: `${lic?.productName} (${lic?.variantName})`, inline: true },
                  { name: "Valor", value: `\`${orderData.amountFormatted}\``, inline: true },
                  { name: "Data/Hora", value: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }), inline: true }
                );

              await salesLogChannel.send({ embeds: [logEmbed] });
            }
          } catch (logErr) {
            console.error("[SALES_LOG_ERROR]", logErr);
          }
        }
      } else if (orderData.status === "CANCELLED") {
        clearInterval(pollInterval);
        activeCarts.delete(session.orderId);
        await channel.send({
          content: "❌ Este pedido foi cancelado no sistema. Fechando o canal em 10 segundos...",
        }).catch(() => {});
        setTimeout(() => channel.delete("Pedido cancelado.").catch(() => {}), 10000);
      }
    } catch (err) {
      console.error("[POLLING_CYCLE_ERROR]", err);
    }
  }, 7000);

  session.interval = pollInterval;
}

/**
 * Trata o botão "Copiar Código Pix"
 */
export async function handleCopyPixCode(interaction: ButtonInteraction, orderId: string) {
  const session = activeCarts.get(orderId);

  if (session && session.pixCode) {
    await interaction.reply({
      content: `📋 **Código Pix Copia e Cola:**\n\`\`\`\n${session.pixCode}\n\`\`\`\n*Copie o código acima e cole na opção Pix Copia e Cola do aplicativo do seu banco.*`,
      ephemeral: true,
    });
    return;
  }

  // Fallback se reiniciou o bot
  try {
    const order = await storeApi.getOrder(orderId);
    await interaction.reply({
      content: `ℹ️ Pedido \`#${order.orderNumber}\` está com status **${order.status}**. Caso precise de ajuda, chame a equipe de suporte.`,
      ephemeral: true,
    });
  } catch {
    await interaction.reply({
      content: "❌ Não foi possível recuperar o código deste pedido.",
      ephemeral: true,
    });
  }
}

/**
 * Trata o cancelamento do carrinho pelo cliente
 */
export async function handleCancelCart(interaction: ButtonInteraction, orderId: string) {
  const session = activeCarts.get(orderId);
  if (session?.interval) {
    clearInterval(session.interval);
  }
  activeCarts.delete(orderId);

  await interaction.reply({
    content: "❌ **Carrinho cancelado.** A reserva foi liberada e este canal será excluído em 5 segundos...",
  });

  setTimeout(async () => {
    try {
      const channel = interaction.channel as TextChannel;
      if (channel) {
        await channel.delete("Cancelado pelo comprador.");
      }
    } catch (err) {
      console.error("[CANCEL_CART_DELETE_ERROR]", err);
    }
  }, 5000);
}

/**
 * Conclui e fecha o carrinho após compra finalizada
 */
export async function handleFinishCart(interaction: ButtonInteraction, orderId: string) {
  const session = activeCarts.get(orderId);
  if (session?.interval) {
    clearInterval(session.interval);
  }
  activeCarts.delete(orderId);

  await interaction.reply({
    content: "✅ **Obrigado pela preferência!** O canal será excluído em 5 segundos...",
  });

  setTimeout(async () => {
    try {
      const channel = interaction.channel as TextChannel;
      if (channel) {
        await channel.delete("Compra concluída com sucesso.");
      }
    } catch (err) {
      console.error("[FINISH_CART_DELETE_ERROR]", err);
    }
  }, 5000);
}
