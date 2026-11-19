import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";

export async function GET() {
  const auth = await requireAdminSession();
  if (!auth.authorized) return auth.response!;

  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        discordId: true,
        discordUsername: true,
        isDiscordVerified: true,
        isBanned: true,
        banReason: true,
        lastLoginAt: true,
        createdAt: true,
        _count: {
          select: {
            orders: true,
            licenses: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, users });
  } catch (error: any) {
    console.error("[ADMIN_GET_USERS_ERROR]", error);
    return NextResponse.json({ error: "Erro ao buscar clientes." }, { status: 500 });
  }
}
