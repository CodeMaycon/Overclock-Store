import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from "discord.js";
import { createBaseEmbed, COLORS } from "../utils/embeds";

export const data = new SlashCommandBuilder()
  .setName("setup-regras")
  .setDescription("Publica o painel com as diretrizes e regras oficiais da Overclock Store")
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
    .setTitle("📜 Diretrizes & Termos de Uso — Overclock Store")
    .setDescription(
      "Para manter nossa comunidade segura, organizada e garantir a melhor experiência para todos os clientes, siga atentamente as diretrizes oficiais abaixo:"
    )
    .addFields(
      {
        name: "1. Respeito & Convivência",
        value: "Mantenha o respeito com todos os membros e com a equipe da staff. Não serão toleradas ofensas, preconceito, assédio ou toxicidade em nenhum canal.",
        inline: false,
      },
      {
        name: "2. Proibição de Spam & Divulgação",
        value: "É estritamente proibido enviar spam, flood, correntes, convites para outros servidores ou qualquer tipo de divulgação comercial não autorizada no chat ou nas DMs dos membros.",
        inline: false,
      },
      {
        name: "3. Atendimento Exclusivo via Tickets",
        value: "Dúvidas técnicas, suporte de instalação, reset de HWID e confirmação de pagamentos devem ser tratados **exclusivamente via Ticket**. Não chame atendentes no privado.",
        inline: false,
      },
      {
        name: "4. Política Rigorosa de Licenças",
        value: "É expressamente proibido revender, vazar, compartilhar ou tentar quebrar proteções das chaves fornecidas. A violação resulta em **revogação imediata da licença e banimento permanente** (HWID, IP e Discord).",
        inline: false,
      },
      {
        name: "5. Compras Seguras & Oficiais",
        value: "Compras oficiais ocorrem apenas pelo site oficial **[overclockstore.com.br](https://overclockstore.com.br)** ou diretamente pelo nosso bot oficial no servidor. A equipe nunca solicitará Pix para contas pessoais em DM.",
        inline: false,
      }
    )
    .setImage("https://overclockstore.com.br/icon.png");

  await interaction.channel.send({
    embeds: [embed],
  });

  await interaction.reply({
    content: "✅ Painel de regras oficiais publicado com sucesso!",
    ephemeral: true,
  });
}
