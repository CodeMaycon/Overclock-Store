import dotenv from "dotenv";

dotenv.config();

function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value || value.trim() === "") {
    throw new Error(`[CONFIG_FATAL] Variável de ambiente obrigatória não configurada: ${key}`);
  }
  return value.trim();
}

function getOptionalEnv(key: string, fallback: string = ""): string {
  return process.env[key]?.trim() || fallback;
}

export const config = {
  discord: {
    token: getRequiredEnv("DISCORD_BOT_TOKEN"),
    clientId: getRequiredEnv("DISCORD_CLIENT_ID"),
    guildId: getRequiredEnv("DISCORD_GUILD_ID"),
    customerRoleId: getOptionalEnv("DISCORD_CUSTOMER_ROLE_ID"),
    supportRoleId: getOptionalEnv("SUPPORT_ROLE_ID"),
    ticketCategoryId: getOptionalEnv("TICKET_CATEGORY_ID"),
    cartCategoryId: getOptionalEnv("CART_CATEGORY_ID"),
    ticketLogsChannelId: getOptionalEnv("TICKET_LOGS_CHANNEL_ID"),
    salesLogsChannelId: getOptionalEnv("SALES_LOGS_CHANNEL_ID"),
  },
  store: {
    apiUrl: getOptionalEnv("STORE_API_URL", "https://overclockstore.com.br").replace(/\/$/, ""),
    siteUrl: getOptionalEnv("STORE_URL", "https://overclockstore.com.br").replace(/\/$/, ""),
    internalSecret: getRequiredEnv("INTERNAL_BOT_SECRET"),
  },
} as const;
