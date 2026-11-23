import { REST, Routes } from "discord.js";
import { config } from "./config";
import { data as setupVerificarData } from "./commands/setup-verificar";
import { data as setupTicketData } from "./commands/setup-ticket";
import { data as painelProdutoData } from "./commands/painel-produto";

export const commands = [
  setupVerificarData.toJSON(),
  setupTicketData.toJSON(),
  painelProdutoData.toJSON(),
];

export async function deployCommands() {
  const rest = new REST({ version: "10" }).setToken(config.discord.token);

  try {
    console.log(`[DEPLOY_COMMANDS] Iniciando registro de ${commands.length} slash commands na guilda ${config.discord.guildId}...`);

    await rest.put(
      Routes.applicationGuildCommands(config.discord.clientId, config.discord.guildId),
      { body: commands }
    );

    console.log("✅ [DEPLOY_COMMANDS] Todos os comandos foram registrados com sucesso no Discord!");
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
