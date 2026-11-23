import { NextRequest, NextResponse } from "next/server";
import { requireBotAuth } from "@/lib/bot-auth";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ discordId: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const auth = requireBotAuth(req);
  if (!auth.authorized) return auth.response!;

  const { discordId } = await params;

  if (!discordId) {
    return NextResponse.json({ error: "discordId é obrigatório." }, { status: 400 });
  }

  const user = await prisma.user.findFirst({
    where: { discordId },
    include: {
      orders: {
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          items: {
            include: {
              product: { select: { name: true } },
              variant: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({
      linked: false,
      message: "Usuário com este Discord ID não está vinculado a nenhuma conta na Overclock Store.",
    });
  }

  const totalCompletedOrders = await prisma.order.count({
    where: {
      userId: user.id,
      status: "COMPLETED",
    },
  });

  const recentOrders = user.orders.map((ord) => ({
    orderNumber: ord.orderNumber,
    product: ord.items[0]?.product?.name || "Software",
    variant: ord.items[0]?.variant?.name || "Plano",
    status: ord.status,
    amountCents: ord.totalCents,
    amountFormatted: `R$ ${(ord.totalCents / 100).toFixed(2).replace(".", ",")}`,
    createdAt: ord.createdAt.toISOString(),
  }));

  return NextResponse.json({
    linked: true,
    user: {
      id: user.id,
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      discordId: user.discordId,
      discordUsername: user.discordUsername,
      discordLinkedAt: user.discordLinkedAt,
      isDiscordVerified: user.isDiscordVerified,
      isBanned: user.isBanned,
      banReason: user.banReason,
      createdAt: user.createdAt.toISOString(),
      totalCompletedOrders,
      recentOrders,
    },
  });
}
