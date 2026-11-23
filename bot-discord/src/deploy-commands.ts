import { REST, Routes } from "discord.js";
import { config } from "./config";
import { data as setupVerificarData } from "./commands/setup-verificar";
import { data as setupTicketData } from "./commands/setup-ticket";
import { data as painelProdutoData } from "./commands/painel-produto";
import { data as setupLojaData } from "./commands/setup-loja";
import { data as setupStatusData } from "./commands/setup-status";
import { data as anunciarData } from "./commands/anunciar";
import { data as setupRegrasData } from "./commands/setup-regras";
import { data as setupAvaliacoesData } from "./commands/setup-avaliacoes";
import { data as setupPainelStaffData } from "./commands/setup-painel-staff";
import { data as clienteData } from "./commands/cliente";
import { data as pedidoData } from "./commands/pedido";
import { data as estoqueData } from "./commands/estoque";

export const commands = [
  setupVerificarData.toJSON(),
  setupTicketData.toJSON(),
  painelProdutoData.toJSON(),
  setupLojaData.toJSON(),
  setupStatusData.toJSON(),
  anunciarData.toJSON(),
  setupRegrasData.toJSON(),
  setupAvaliacoesData.toJSON(),
  setupPainelStaffData.toJSON(),
  clienteData.toJSON(),
  pedidoData.toJSON(),
  estoqueData.toJSON(),
];

export async function deployCommands() {
  const rest = new REST({ version: "10" }).setToken(config.discord.token);

  try {
    console.log(`[DEPLOY_COMMANDS] Iniciando registro de ${commands.length} slash commands na guilda ${config.discord.guildId}...`);

    await rest.put(
      Routes.applicationGuildCommands(config.discord.clientId, config.discord.guildId),
      { body: commands }
    );

    console.log(`✅ [DEPLOY_COMMANDS] Todos os ${commands.length} comandos foram registrados com sucesso no Discord!`);
  } catch (error) {
    console.error("❌ [DEPLOY_COMMANDS_ERROR] Falha ao registrar comandos:", error);
    throw error;
  }
}

// Se executado diretamente via terminal (`tsx src/deploy-commands.ts`)
if (require.main === module) {
  deployCommands()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
