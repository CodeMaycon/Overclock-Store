import "server-only";

export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  global_name?: string | null;
  avatar?: string | null;
}

export interface DiscordRoleResult {
  success: boolean;
  notInGuild?: boolean;
  error?: string;
  simulated?: boolean;
}

const DISCORD_API_BASE = "https://discord.com/api/v10";

export function getDiscordConfig() {
  return {
    clientId: process.env.DISCORD_CLIENT_ID || "",
    clientSecret: process.env.DISCORD_CLIENT_SECRET || "",
    botToken: process.env.DISCORD_BOT_TOKEN || "",
    guildId: process.env.DISCORD_GUILD_ID || "",
    verifiedRoleId: process.env.DISCORD_VERIFIED_ROLE_ID || "",
    customerRoleId: process.env.DISCORD_CUSTOMER_ROLE_ID || "",
  };
}

/**
 * Concede um cargo do Discord a um membro da guilda oficial via API REST v10.
 * Resiliente: Trata membro inexistente (404), falta de credenciais e erros de rede sem estourar exceções.
 */
export async function assignDiscordRole(
  discordId: string,
  roleId: string
): Promise<DiscordRoleResult> {
  const { botToken, guildId } = getDiscordConfig();

  if (!botToken || !guildId || botToken.startsWith("seu_") || guildId.startsWith("id_")) {
    console.info(
      `[DISCORD_DEV] Simulação: Cargo ${roleId} concedido ao Discord ID ${discordId} (credenciais não configuradas).`
    );
    return { success: true, simulated: true };
  }

  if (!discordId || !roleId) {
    return { success: false, error: "discordId e roleId são obrigatórios." };
  }

  try {
    const url = `${DISCORD_API_BASE}/guilds/${guildId}/members/${discordId}/roles/${roleId}`;
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
    });

    if (res.status === 204 || res.ok) {
      return { success: true };
    }

    if (res.status === 404) {
      const errJson = await res.json().catch(() => ({}));
      // Code 10007 = Unknown Member (ainda não entrou no servidor)
      console.warn(
        `[DISCORD_ROLE_ASSIGN_WARN] Usuário ${discordId} não está no servidor ${guildId} (HTTP 404 / code ${errJson.code}).`
      );
      return {
        success: false,
        notInGuild: true,
        error: "O usuário ainda não entrou no servidor oficial do Discord.",
      };
    }

    const errorText = await res.text().catch(() => "");
    console.warn(
      `[DISCORD_ROLE_ASSIGN_WARN] Falha ao atribuir cargo ${roleId} a ${discordId}. Status: ${res.status} Body: ${errorText}`
    );
    return {
      success: false,
      error: `Discord API status ${res.status}: ${errorText}`,
    };
  } catch (err: any) {
    console.error("[DISCORD_ROLE_ASSIGN_EXCEPTION]", err);
    return {
      success: false,
      error: err?.message || "Erro de rede ao comunicar com API do Discord.",
    };
  }
}

/**
 * Remove um cargo do Discord de um membro da guilda oficial via API REST v10.
 */
export async function removeDiscordRole(
  discordId: string,
  roleId: string
): Promise<DiscordRoleResult> {
  const { botToken, guildId } = getDiscordConfig();

  if (!botToken || !guildId || botToken.startsWith("seu_") || guildId.startsWith("id_")) {
    console.info(
      `[DISCORD_DEV] Simulação: Cargo ${roleId} removido do Discord ID ${discordId} (credenciais não configuradas).`
    );
    return { success: true, simulated: true };
  }

  if (!discordId || !roleId) {
    return { success: false, error: "discordId e roleId são obrigatórios." };
  }

  try {
    const url = `${DISCORD_API_BASE}/guilds/${guildId}/members/${discordId}/roles/${roleId}`;
    const res = await fetch(url, {
      method: "DELETE",
      headers: {
        Authorization: `Bot ${botToken}`,
      },
    });

    if (res.status === 204 || res.ok) {
      return { success: true };
    }

    if (res.status === 404) {
      return {
        success: false,
        notInGuild: true,
        error: "O usuário não está no servidor ou já não possuía o cargo.",
      };
    }

    const errorText = await res.text().catch(() => "");
    console.warn(
      `[DISCORD_ROLE_REMOVE_WARN] Falha ao remover cargo ${roleId} de ${discordId}. Status: ${res.status}`
    );
    return {
      success: false,
      error: `Discord API status ${res.status}: ${errorText}`,
    };
  } catch (err: any) {
    console.error("[DISCORD_ROLE_REMOVE_EXCEPTION]", err);
    return {
      success: false,
      error: err?.message || "Erro de rede ao comunicar com API do Discord.",
    };
  }
}

/**
 * Gera URL de autorização OAuth2 do Discord
 */
export function getDiscordOAuthUrl(redirectUri: string, state: string): string {
  const { clientId } = getDiscordConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "identify",
    state: state,
    prompt: "consent",
  });

  return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
}

/**
 * Troca authorization code pelo access token OAuth2
 */
export async function exchangeDiscordCode(
  code: string,
  redirectUri: string
): Promise<{ access_token: string; token_type: string } | null> {
  const { clientId, clientSecret } = getDiscordConfig();

  if (!clientId || !clientSecret || clientId.startsWith("seu_")) {
    console.warn("[DISCORD_OAUTH_WARN] DISCORD_CLIENT_ID ou DISCORD_CLIENT_SECRET não configurados.");
    return null;
  }

  try {
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code: code,
      redirect_uri: redirectUri,
    });

    const res = await fetch(`${DISCORD_API_BASE}/oauth2/token`, {
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
 * Obtém perfil do usuário autenticado (/users/@me)
 */
export async function getDiscordUser(accessToken: string): Promise<DiscordUser | null> {
  try {
    const res = await fetch(`${DISCORD_API_BASE}/users/@me`, {
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
