import { NextRequest, NextResponse } from "next/server";
import { requireClientSession } from "@/lib/client-auth";
import { prisma } from "@/lib/prisma";
import { exchangeDiscordCode, getDiscordUser, assignDiscordRole, getDiscordConfig } from "@/lib/discord";
import { ActorType } from "@prisma/client";

export async function GET(req: NextRequest) {
  const host = req.headers.get("host") || "localhost:3001";
  const protocol = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || `${protocol}://${host}`;

  const auth = await requireClientSession();
  if (!auth.authorized) {
    return NextResponse.redirect(`${baseUrl}/login?callbackUrl=/dashboard`);
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const storedState = req.cookies.get("discord_oauth_state")?.value;

  if (!code || !state || (storedState && state !== storedState)) {
    return NextResponse.redirect(`${baseUrl}/dashboard?discord=error&reason=invalid_state`);
  }

  const redirectUri = `${baseUrl}/api/auth/discord/callback`;
  const tokenData = await exchangeDiscordCode(code, redirectUri);
  if (!tokenData) {
    return NextResponse.redirect(`${baseUrl}/dashboard?discord=error&reason=exchange_failed`);
  }

  const discordUser = await getDiscordUser(tokenData.access_token);
  if (!discordUser) {
    return NextResponse.redirect(`${baseUrl}/dashboard?discord=error&reason=profile_failed`);
  }

  // REGRA 1:1 RIGOROSA: Um mesmo discordId não pode ser vinculado a dois usuários diferentes
  const existingUserWithDiscord = await prisma.user.findFirst({
    where: {
      discordId: discordUser.id,
      NOT: { id: auth.userId! },
    },
  });

  if (existingUserWithDiscord) {
    const res = NextResponse.redirect(`${baseUrl}/dashboard?discord=already_linked`);
    res.cookies.delete("discord_oauth_state");
    return res;
  }

  // 1. Atualiza o usuário com os dados do Discord
  const updatedUser = await prisma.user.update({
    where: { id: auth.userId! },
    data: {
      discordId: discordUser.id,
      discordUsername: discordUser.username,
      discordLinkedAt: new Date(),
      isDiscordVerified: true,
      avatarUrl: discordUser.avatar
        ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
        : undefined,
    },
  });

  // 2. Entregar cargo @Verificado
  const { verifiedRoleId, customerRoleId } = getDiscordConfig();
  let notInGuild = false;

  if (verifiedRoleId) {
    const verifiedResult = await assignDiscordRole(discordUser.id, verifiedRoleId);
    if (verifiedResult.notInGuild) {
      notInGuild = true;
    }
  }

  // 3. Se tiver ao menos 1 pedido COMPLETED, entregar cargo de Cliente e cargos de produto
  const completedOrders = await prisma.order.findMany({
    where: {
      userId: auth.userId!,
      status: "COMPLETED",
    },
    include: {
      items: {
        include: {
          product: {
            select: { discordRoleId: true },
          },
        },
      },
    },
  });

  if (completedOrders.length > 0 && customerRoleId) {
    const customerResult = await assignDiscordRole(discordUser.id, customerRoleId);
    if (customerResult.notInGuild) {
      notInGuild = true;
    }
  }

  // Cargos específicos de produtos adquiridos
  for (const order of completedOrders) {
    for (const item of order.items) {
      if (item.product?.discordRoleId) {
        await assignDiscordRole(discordUser.id, item.product.discordRoleId);
      }
    }
  }

  // 4. AuditLog
  await prisma.auditLog.create({
    data: {
      userId: auth.userId!,
      actorType: ActorType.USER,
      action: "DISCORD_ACCOUNT_LINKED",
      entityType: "User",
      entityId: auth.userId!,
      metadata: {
        discordId: discordUser.id,
        discordUsername: discordUser.username,
        notInGuild,
        totalCompletedOrders: completedOrders.length,
      },
    },
  });

  const redirectTarget = notInGuild
    ? `${baseUrl}/dashboard?discord=linked_not_in_guild`
    : `${baseUrl}/dashboard?discord=linked`;

  const response = NextResponse.redirect(redirectTarget);
  response.cookies.delete("discord_oauth_state");
  return response;
}
