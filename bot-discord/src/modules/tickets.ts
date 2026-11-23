import {
  StringSelectMenuInteraction,
  ButtonInteraction,
  ChannelType,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
  TextChannel,
  GuildMember,
} from "discord.js";
import { config } from "../config";
import { storeApi } from "../services/store-api";
import { createBaseEmbed, COLORS, createErrorEmbed } from "../utils/embeds";

const CATEGORY_NAMES: Record<string, string> = {
  pre_compra: "💡 Dúvida Pré-Compra",
  suporte_tecnico: "🛠️ Suporte Técnico / Instalação",
  pagamento_licenca: "💳 Pagamento / Licença",
};

/**
 * Manipula a criação de um novo ticket via menu de seleção
 */
export async function handleTicketCreate(interaction: StringSelectMenuInteraction) {
  const guild = interaction.guild;
  if (!guild) {
    await interaction.reply({ content: "Comando disponível apenas em servidores.", ephemeral: true });
    return;
  }

  const categoryKey = interaction.values[0];
  const categoryLabel = CATEGORY_NAMES[categoryKey] || "Geral";
  const user = interaction.user;

  await interaction.deferReply({ ephemeral: true });

  try {
    // 1. Verifica se já existe um canal aberto para este usuário
    const existingChannel = guild.channels.cache.find((ch) => {
      if (ch.type !== ChannelType.GuildText) return false;
      const textCh = ch as TextChannel;
      return (
        textCh.topic?.includes(`ticket-user:${user.id}`) &&
        (!config.discord.ticketCategoryId || textCh.parentId === config.discord.ticketCategoryId)
      );
    });

    if (existingChannel) {
      await interaction.editReply({
        content: `⚠️ Você já possui um ticket em andamento em <#${existingChannel.id}>. Por favor, encerre-o antes de abrir um novo atendimento.`,
      });
      return;
    }

    // 2. Prepara permissões do canal
    const permissionOverwrites: any[] = [
      {
        id: guild.id, // @everyone
        deny: [PermissionFlagsBits.ViewChannel],
      },
      {
        id: user.id, // Autor
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.EmbedLinks,
        ],
      },
      {
        id: guild.client.user.id, // Bot
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
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.EmbedLinks,
        ],
      });
    }

    const cleanUsername = user.username.toLowerCase().replace(/[^a-z0-9_-]/g, "");
    const channelName = `ticket-${cleanUsername || user.id.slice(-4)}`;

    // 3. Cria canal de texto
    const channel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: config.discord.ticketCategoryId || undefined,
      topic: `ticket-user:${user.id} | Categoria: ${categoryLabel}`,
      permissionOverwrites,
    });

    // 4. Consulta dados do cliente na API da loja
    let clientContextEmbed = createBaseEmbed(COLORS.PRIMARY);
    try {
      const apiUser = await storeApi.getUserByDiscordId(user.id);
      if (apiUser.linked && apiUser.user) {
        const u = apiUser.user;
        clientContextEmbed
          .setTitle("🛡️ Ficha do Cliente — Overclock Store")
          .setDescription(`Informações sincronizadas da conta vinculada ao Discord:`)
          .addFields(
            { name: "👤 Nome / Usuário", value: `${u.fullName} (@${u.username})`, inline: true },
            { name: "📧 E-mail Cadastrado", value: `\`${u.email}\``, inline: true },
            { name: "🛍️ Total de Compras", value: `**${u.totalCompletedOrders}** pedido(s) concluído(s)`, inline: true },
            { name: "⚡ Status da Conta", value: u.isBanned ? "🔴 **BANIDO**" : "🟢 **Regular**", inline: true }
          );

        if (u.recentOrders && u.recentOrders.length > 0) {
          const recentList = u.recentOrders.map(
            (o) => `• \`#${o.orderNumber}\` — ${o.product} (${o.variant}) • **${o.amountFormatted}** [${o.status}]`
          );
          clientContextEmbed.addFields({
            name: "📋 Últimos Pedidos",
            value: recentList.join("\n"),
            inline: false,
          });
        }
      } else {
        clientContextEmbed
          .setTitle("ℹ️ Contexto do Atendimento")
          .setDescription(
            `Conta do Discord **ainda não vinculada** ao site da Overclock Store.\n` +
            `*O cliente pode vincular sua conta na Área do Cliente (${config.store.siteUrl}/dashboard) para liberar histórico e cargos automáticos.*`
          );
      }
    } catch (err) {
      console.error("[TICKETS_USER_FETCH_ERROR]", err);
      clientContextEmbed
        .setTitle("ℹ️ Contexto do Atendimento")
        .setDescription("Não foi possível carregar a ficha da loja neste momento.");
    }

    // 5. Embed de boas-vindas do ticket
    const welcomeEmbed = createBaseEmbed(COLORS.PRIMARY)
      .setTitle(`Atendimento Aberto — ${categoryLabel}`)
      .setDescription(
        `Olá <@${user.id}>! Seja bem-vindo ao canal de suporte da **Overclock Store**.\n\n` +
        `Descreva detalhadamente o motivo do seu contato, anexando prints ou mensagens de erro se necessário. ` +
        `Um atendente da nossa equipe responderá em instantes.\n\n` +
        `*Quando o atendimento for finalizado, utilize o botão abaixo para encerrar e gerar o histórico.*`
      );

    const closeRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("btn_close_ticket")
        .setLabel("Fechar Ticket")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("🔒")
    );

    await channel.send({
      content: `<@${user.id}> ${config.discord.supportRoleId ? `<@&${config.discord.supportRoleId}>` : ""}`,
      embeds: [welcomeEmbed, clientContextEmbed],
      components: [closeRow],
    });

    await interaction.editReply({
      content: `✅ Seu ticket foi aberto com sucesso em <#${channel.id}>!`,
    });
  } catch (error: any) {
    console.error("[TICKET_CREATE_ERROR]", error);
    await interaction.editReply({
      content: `❌ Ocorreu um erro ao criar seu ticket: ${error?.message || "Erro interno"}`,
    });
  }
}

/**
 * Encerra o ticket, gera transcript em .txt e envia para o canal de logs
 */
export async function handleTicketClose(interaction: ButtonInteraction) {
  const channel = interaction.channel;
  if (!channel || channel.type !== ChannelType.GuildText) {
    await interaction.reply({ content: "Canal inválido para encerramento.", ephemeral: true });
    return;
  }

  const textChannel = channel as TextChannel;
  const user = interaction.user;
  const member = interaction.member as GuildMember | null;

  // Verifica permissão (autor do ticket, administrador ou cargo de suporte)
  const isTicketAuthor = textChannel.topic?.includes(`ticket-user:${user.id}`);
  const isAdmin = member?.permissions?.has(PermissionFlagsBits.Administrator);
  const isSupport = config.discord.supportRoleId && member?.roles?.cache?.has(config.discord.supportRoleId);

  if (!isTicketAuthor && !isAdmin && !isSupport) {
    await interaction.reply({
      content: "❌ Você não tem permissão para encerrar este ticket.",
      ephemeral: true,
    });
    return;
  }

  await interaction.reply({
    content: "🔒 **Encerrando ticket em 5 segundos...** Gerando transcript e salvando nos registros...",
  });

  try {
    // 1. Coleta histórico de mensagens
    const messages = await textChannel.messages.fetch({ limit: 100 });
    const sortedMessages = Array.from(messages.values()).reverse();

    const transcriptLines = [
      "===========================================================",
      "OVERCLOCK STORE — TRANSCRIPT OFICIAL DE ATENDIMENTO",
      `Canal: #${textChannel.name} (ID: ${textChannel.id})`,
      `Tópico: ${textChannel.topic || "Sem tópico"}`,
      `Encerrado por: ${user.tag} (ID: ${user.id})`,
      `Data de Encerramento: ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`,
      "===========================================================",
      "",
    ];

    for (const msg of sortedMessages) {
      const time = new Date(msg.createdTimestamp).toLocaleTimeString("pt-BR", {
        timeZone: "America/Sao_Paulo",
      });
      const author = msg.author.bot ? `[BOT] ${msg.author.tag}` : msg.author.tag;
      let content = msg.content;
      if (msg.embeds.length > 0) {
        content += msg.embeds.map((e) => ` [Embed: ${e.title || "Sem título"}]`).join("");
      }
      if (msg.attachments.size > 0) {
        content += msg.attachments.map((a) => ` [Anexo: ${a.url}]`).join("");
      }
      transcriptLines.push(`[${time}] ${author}: ${content}`);
    }

    transcriptLines.push("\n[FIM DO TRANSCRIPT]");

    const transcriptBuffer = Buffer.from(transcriptLines.join("\n"), "utf-8");
    const attachment = new AttachmentBuilder(transcriptBuffer, {
      name: `transcript-${textChannel.name}-${Date.now()}.txt`,
    });

    // 2. Envia para o canal de logs de tickets se configurado
    if (config.discord.ticketLogsChannelId) {
      const logsChannel = interaction.guild?.channels.cache.get(
        config.discord.ticketLogsChannelId
      ) as TextChannel | undefined;

      if (logsChannel && logsChannel.isTextBased()) {
        const logEmbed = createBaseEmbed(COLORS.INFO)
          .setTitle("📁 Ticket Encerrado")
          .setDescription(`O canal **#${textChannel.name}** foi encerrado e arquivado com sucesso.`)
          .addFields(
            { name: "Encerrado por", value: `<@${user.id}> (\`${user.id}\`)`, inline: true },
            { name: "Total de Mensagens", value: `${sortedMessages.length}`, inline: true }
          );

        await logsChannel.send({
          embeds: [logEmbed],
          files: [attachment],
        });
      }
    }

    // 3. Aguarda 5 segundos e deleta o canal
    setTimeout(async () => {
      try {
        await textChannel.delete("Ticket encerrado.");
      } catch (delErr) {
        console.error("[DELETE_TICKET_CHANNEL_ERROR]", delErr);
      }
    }, 5000);
  } catch (err) {
    console.error("[TICKET_CLOSE_ERROR]", err);
    setTimeout(async () => {
      try {
        await textChannel.delete("Ticket encerrado com erro no transcript.");
      } catch {}
    }, 5000);
  }
}
