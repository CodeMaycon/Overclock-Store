import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DiscordService } from "@/services/discord.service";
import { ActorType } from "@prisma/client";

export async function GET(req: NextRequest) {
  const host = req.headers.get("host") || "localhost:3001";
  const protocol = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const appUrl = process.env.NEXTAUTH_URL || `${protocol}://${host}`;

  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.redirect(`${appUrl}/login?callbackUrl=/dashboard`);
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const storedState = req.cookies.get("discord_oauth_state")?.value;

  if (!code || !state || (storedState && state !== storedState)) {
    return NextResponse.redirect(`${appUrl}/dashboard?discord_error=invalid_state`);
  }

  const redirectUri = `${appUrl}/api/discord/callback`;
  const tokenData = await DiscordService.exchangeCode(code, redirectUri);

  if (!tokenData) {
    return NextResponse.redirect(`${appUrl}/dashboard?discord_error=exchange_failed`);
  }

  const discordUser = await DiscordService.getUserProfile(tokenData.access_token);
  if (!discordUser) {
    return NextResponse.redirect(`${appUrl}/dashboard?discord_error=profile_failed`);
  }

  // REGRA 1:1 RIGOROSA: Um mesmo discordId não pode ser vinculado a duas contas diferentes
  const existingUserWithDiscord = await prisma.user.findFirst({
    where: {
      discordId: discordUser.id,
      NOT: { id: session.user.id },
    },
  });

  if (existingUserWithDiscord) {
    return NextResponse.redirect(`${appUrl}/dashboard?discord_error=already_linked_to_another_account`);
  }

  // 1. Atualiza o usuário com os dados do Discord
  const updatedUser = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      discordId: discordUser.id,
      discordUsername: discordUser.username,
      isDiscordVerified: true,
      avatarUrl: discordUser.avatar
        ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
        : undefined,
    },
  });

  // 2. Busca todas as compras concluídas para resgatar os cargos de produtos comprados
  const userOrders = await prisma.order.findMany({
    where: {
      userId: session.user.id,
      status: "COMPLETED",
    },
    include: {
      items: {
        include: {
          product: {
            select: { discordRoleId: true, name: true },
          },
        },
      },
    },
  });

  const productRoles = userOrders
    .flatMap((ord) => ord.items.map((it) => it.product?.discordRoleId))
    .filter((roleId): roleId is string => Boolean(roleId));

  // 3. Sincroniza cargos no Discord
  await DiscordService.syncRoles(discordUser.id, productRoles, tokenData.access_token);

  // 4. Registra no AuditLog
  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      actorType: ActorType.USER,
      action: "DISCORD_ACCOUNT_LINKED",
      entityType: "User",
      entityId: session.user.id,
      metadata: {
        discordId: discordUser.id,
        discordUsername: discordUser.username,
        rolesAssignedCount: productRoles.length,
      },
    },
  });

  // 5. Envia notificação para o Webhook Administrativo
  await DiscordService.sendAdminWebhook({
    title: "🎮 Conta Discord Vinculada com Sucesso",
    description: `O cliente **${updatedUser.fullName}** (@${updatedUser.username}) vinculou sua conta do Discord.`,
    fields: [
      { name: "Usuário Discord", value: `@${discordUser.username} (${discordUser.id})`, inline: true },
      { name: "E-mail na Loja", value: updatedUser.email, inline: true },
      { name: "Status de Vínculo", value: "✓ 1:1 Verificado", inline: true },
    ],
    color: 0x5865f2, // Discord Blurple
  });

  const response = NextResponse.redirect(`${appUrl}/dashboard?discord_success=linked`);
  response.cookies.delete("discord_oauth_state");
  return response;
}
