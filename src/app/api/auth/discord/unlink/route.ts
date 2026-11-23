import { NextRequest, NextResponse } from "next/server";
import { requireClientSession } from "@/lib/client-auth";
import { prisma } from "@/lib/prisma";
import { removeDiscordRole, getDiscordConfig } from "@/lib/discord";
import { ActorType } from "@prisma/client";

export async function POST(req: NextRequest) {
  const auth = await requireClientSession();
  if (!auth.authorized) return auth.response!;

  const user = await prisma.user.findUnique({
    where: { id: auth.userId! },
  });

  if (!user?.discordId) {
    return NextResponse.json({ error: "Nenhuma conta Discord vinculada." }, { status: 400 });
  }

  const prevDiscordId = user.discordId;
  const prevDiscordUsername = user.discordUsername;

  // Tenta remover cargos de forma resiliente
  const { verifiedRoleId, customerRoleId } = getDiscordConfig();
  if (verifiedRoleId) {
    await removeDiscordRole(prevDiscordId, verifiedRoleId);
  }
  if (customerRoleId) {
    await removeDiscordRole(prevDiscordId, customerRoleId);
  }

  await prisma.user.update({
    where: { id: auth.userId! },
    data: {
      discordId: null,
      discordUsername: null,
      discordLinkedAt: null,
      isDiscordVerified: false,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: auth.userId!,
      actorType: ActorType.USER,
      action: "DISCORD_ACCOUNT_UNLINKED",
      entityType: "User",
      entityId: auth.userId!,
      metadata: {
        previousDiscordId: prevDiscordId,
        previousDiscordUsername: prevDiscordUsername,
      },
    },
  });

  return NextResponse.json({
    success: true,
    message: "Conta Discord desvinculada com sucesso.",
  });
}
