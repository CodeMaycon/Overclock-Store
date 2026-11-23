import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ActorType } from "@prisma/client";
import { getDiscordConfig, removeDiscordRole } from "@/lib/discord";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!currentUser?.discordId) {
    return NextResponse.json({ error: "Nenhuma conta Discord vinculada." }, { status: 400 });
  }

  const prevDiscordId = currentUser.discordId;
  const prevDiscordUsername = currentUser.discordUsername;

  const { verifiedRoleId, customerRoleId } = getDiscordConfig();
  if (verifiedRoleId) await removeDiscordRole(prevDiscordId, verifiedRoleId);
  if (customerRoleId) await removeDiscordRole(prevDiscordId, customerRoleId);

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      discordId: null,
      discordUsername: null,
      discordLinkedAt: null,
      isDiscordVerified: false,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      actorType: ActorType.USER,
      action: "DISCORD_ACCOUNT_UNLINKED",
      entityType: "User",
      entityId: session.user.id,
      metadata: {
        previousDiscordId: prevDiscordId,
        previousDiscordUsername: prevDiscordUsername,
      },
    },
  });

  return NextResponse.json({ success: true, message: "Conta Discord desvinculada com sucesso." });
}
