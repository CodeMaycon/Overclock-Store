import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/admin/users/[id] - Detalhes do cliente, compras e licenças
export async function GET(req: NextRequest, { params }: RouteParams) {
  const auth = await requireAdminSession();
  if (!auth.authorized) return auth.response!;

  const resolved = await params;

  try {
    const user = await prisma.user.findUnique({
      where: { id: resolved.id },
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
        lastLoginIp: true,
        createdAt: true,
        orders: {
          orderBy: { createdAt: "desc" },
          include: {
            items: {
              include: {
                product: { select: { name: true, slug: true } },
                variant: { select: { name: true } },
              },
            },
            payments: {
              take: 1,
              orderBy: { createdAt: "desc" },
              select: { method: true, status: true, gateway: true },
            },
          },
        },
        licenses: {
          orderBy: { createdAt: "desc" },
          include: {
            product: { select: { name: true, slug: true } },
            variant: { select: { name: true, durationValue: true, durationType: true } },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });
    }

    return NextResponse.json({ success: true, user });
  } catch (error: any) {
    console.error("[ADMIN_GET_USER_DETAILS_ERROR]", error);
    return NextResponse.json({ error: "Erro ao buscar detalhes do cliente." }, { status: 500 });
  }
}
