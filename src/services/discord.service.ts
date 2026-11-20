import { prisma } from "@/lib/prisma";

export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  global_name?: string | null;
  avatar?: string | null;
}

export class DiscordService {
  private static clientId = process.env.DISCORD_CLIENT_ID || "";
  private static clientSecret = process.env.DISCORD_CLIENT_SECRET || "";
  private static botToken = process.env.DISCORD_BOT_TOKEN || "";
  private static guildId = process.env.DISCORD_GUILD_ID || "";
  private static verifiedRoleId = process.env.DISCORD_VERIFIED_ROLE_ID || "";
  private static customerRoleId = process.env.DISCORD_CUSTOMER_ROLE_ID || "";
  private static webhookUrl = process.env.DISCORD_ADMIN_WEBHOOK_URL || "";

  /**
   * Gera URL de autorização OAuth2 do Discord
   */
  static getAuthorizationUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "identify guilds.join",
      state: state,
      prompt: "consent",
    });

    return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
  }

  /**
   * Troca o authorization code pelo access token OAuth2
   */
  static async exchangeCode(code: string, redirectUri: string): Promise<{ access_token: string; token_type: string } | null> {
    if (!this.clientId || !this.clientSecret) {
      console.warn("[DISCORD_OAUTH_WARN] DISCORD_CLIENT_ID ou DISCORD_CLIENT_SECRET não configurados.");
      return null;
    }

    try {
      const body = new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: "authorization_code",
        code: code,
        redirect_uri: redirectUri,
      });

      const res = await fetch("https://discord.com/api/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("[DISCORD_EXCHANGE_CODE_ERROR]", res.status, errorText);
        return null;
      }

      return await res.json();
    } catch (err) {
      console.error("[DISCORD_EXCHANGE_CODE_EXCEPTION]", err);
      return null;
    }
  }

  /**
   * Obtém os dados do usuário autenticado via Discord API
   */
  static async getUserProfile(accessToken: string): Promise<DiscordUser | null> {
    try {
      const res = await fetch("https://discord.com/api/users/@me", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!res.ok) {
        console.error("[DISCORD_GET_USER_ERROR]", res.status, await res.text());
        return null;
      }

      return await res.json();
    } catch (err) {
      console.error("[DISCORD_GET_USER_EXCEPTION]", err);
      return null;
    }
  }

  /**
   * Adiciona o usuário ao servidor e concede os cargos especificados
   */
  static async syncRoles(discordId: string, additionalRoleIds: string[] = [], accessToken?: string): Promise<boolean> {
    if (!this.botToken || !this.guildId) {
      console.info(`[DISCORD_DEV_LOG] Simulação: Cargos [${additionalRoleIds.join(", ")}] sincronizados para Discord ID ${discordId} (Bot token/guild não configurados).`);
      return true;
    }

    const rolesToAdd = new Set<string>();
    // Concede no máximo o Cargo Verificado oficial
    if (this.verifiedRoleId) rolesToAdd.add(this.verifiedRoleId);

    try {
      // 1. Tenta adicionar usuário na guilda caso tenhamos o accessToken OAuth2
      if (accessToken) {
        try {
          await fetch(`https://discord.com/api/guilds/${this.guildId}/members/${discordId}`, {
            method: "PUT",
            headers: {
              Authorization: `Bot ${this.botToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              access_token: accessToken,
              roles: Array.from(rolesToAdd),
            }),
          });
        } catch (_) {}
      }

      // 2. Concede cada cargo individualmente via API do Bot
      for (const roleId of Array.from(rolesToAdd)) {
        const url = `https://discord.com/api/guilds/${this.guildId}/members/${discordId}/roles/${roleId}`;
        const res = await fetch(url, {
          method: "PUT",
          headers: {
            Authorization: `Bot ${this.botToken}`,
          },
        });

        if (!res.ok && res.status !== 204) {
          console.warn(`[DISCORD_ROLE_ASSIGN_WARN] Cargo ${roleId} não pôde ser atribuído ao usuário ${discordId}. Status: ${res.status}`);
        }
      }

      return true;
    } catch (err) {
      console.error("[DISCORD_SYNC_ROLES_ERROR]", err);
      return false;
    }
  }

  /**
   * Envia notificação em tempo real via Webhook Administrativo
   */
  static async sendAdminWebhook(params: {
    title: string;
    description?: string;
    fields?: { name: string; value: string; inline?: boolean }[];
    color?: number; // 0x10B981 padrão
  }): Promise<void> {
    const webhook = this.webhookUrl || process.env.DISCORD_ADMIN_WEBHOOK_URL;
    if (!webhook) {
      console.info(`[DISCORD_WEBHOOK_LOG] [${params.title}] ${params.description || ""}`);
      return;
    }

    try {
      const payload = {
        username: "Overclock Bot Security",
        avatar_url: "https://overclockstore.com/favicon.ico",
        embeds: [
          {
            title: params.title,
            description: params.description,
            color: params.color || 0x10b981, // Emerald Green
            fields: params.fields || [],
            footer: {
              text: "Overclock Store • Telemetria de Segurança em Tempo Real",
            },
            timestamp: new Date().toISOString(),
          },
        ],
      };

      await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.error("[DISCORD_WEBHOOK_ERROR]", err);
    }
  }
}
