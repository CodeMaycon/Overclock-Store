import { EmbedBuilder } from "discord.js";
import { config } from "../config";

export const COLORS = {
  PRIMARY: 0x10b981, // Verde Esmeralda Overclock
  WARNING: 0xf59e0b, // Âmbar / Alerta
  ERROR: 0xef4444,   // Vermelho / Erro
  INFO: 0x3b82f6,    // Azul / Informativo
  DARK: 0x18181b,    // Zinc Dark
} as const;

export function createBaseEmbed(color: number = COLORS.PRIMARY): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(color)
    .setFooter({
      text: "Overclock Store • overclockstore.com.br",
    })
    .setTimestamp();
}

export function createSuccessEmbed(title: string, description: string): EmbedBuilder {
  return createBaseEmbed(COLORS.PRIMARY)
    .setTitle(`✅ ${title}`)
    .setDescription(description);
}

export function createWarningEmbed(title: string, description: string): EmbedBuilder {
  return createBaseEmbed(COLORS.WARNING)
    .setTitle(`⚠️ ${title}`)
    .setDescription(description);
}

export function createErrorEmbed(title: string, description: string): EmbedBuilder {
  return createBaseEmbed(COLORS.ERROR)
    .setTitle(`❌ ${title}`)
    .setDescription(description);
}

export function createVerificationEmbed(): EmbedBuilder {
  return createBaseEmbed(COLORS.PRIMARY)
    .setTitle("🛡️ Verificação de Conta — Overclock Store")
    .setDescription(
      "Vincule sua conta do Discord ao site da **Overclock Store** para liberar acesso exclusivo, suporte prioritário e o cargo oficial **@Verificado** no servidor.\n\n" +
      "**Vantagens da Vinculação:**\n" +
      "• ⚡ Cargo automático **@Verificado** instantâneo\n" +
      "• 👑 Cargo de **Cliente VIP** liberado automaticamente após sua primeira compra\n" +
      "• 🎫 Atendimento prioritário e sincronizado via Tickets\n" +
      "• 🔑 Acesso centralizado ao histórico de licenças no Dashboard\n\n" +
      "Clique no botão abaixo para abrir a Área do Cliente e conectar sua conta com 1 clique:"
    )
    .setThumbnail("https://overclockstore.com.br/icon.png");
}

export function createTicketPanelEmbed(): EmbedBuilder {
  return createBaseEmbed(COLORS.PRIMARY)
    .setTitle("🎫 Central de Atendimento & Suporte — Overclock Store")
    .setDescription(
      "Seja bem-vindo ao suporte oficial da **Overclock Store**!\n\n" +
      "Nossa equipe técnica e comercial está pronta para lhe atender. " +
      "Para abrir um ticket privado, selecione a categoria correspondente à sua dúvida ou necessidade no menu abaixo.\n\n" +
      "**Categorias Disponíveis:**\n" +
      "• 💡 **Dúvida Pré-Compra:** Compatibilidade de hardware, especificações ou dúvidas antes de adquirir.\n" +
      "• 🛠️ **Suporte Técnico / Instalação:** Ativação de chaves, download do loader, antivírus ou reset de HWID.\n" +
      "• 💳 **Pagamento / Licença:** Confirmação de Pix, liberação de licenças e financeiro.\n\n" +
      "⏰ *Atendimento ágil de segunda a domingo.*"
    );
}
