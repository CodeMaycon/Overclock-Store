import { NextRequest, NextResponse } from "next/server";
import { requireClientSession } from "@/lib/client-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireClientSession();
  if (!auth.authorized) return auth.response!;

  const user = await prisma.user.findUnique({
    where: { id: auth.userId! },
    select: {
      id: true,
      username: true,
      email: true,
      fullName: true,
      role: true,
      discordId: true,
      discordUsername: true,
      discordLinkedAt: true,
      isDiscordVerified: true,
      avatarUrl: true,
      createdAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
  }

  return NextResponse.json({ success: true, user });
}
