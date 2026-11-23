import { NextRequest, NextResponse } from "next/server";
import { requireClientSession } from "@/lib/client-auth";
import { prisma } from "@/lib/prisma";
import { assignDiscordRole, getDiscordConfig } from "@/lib/discord";

export async function POST(req: NextRequest) {
  const auth = await requireClientSession();
  if (!auth.authorized) return auth.response!;

  const user = await prisma.user.findUnique({
    where: { id: auth.userId! },
  });

  if (!user?.discordId) {
    return NextResponse.json({ error: "Nenhuma conta Discord vinculada." }, { status: 400 });
  }

  const { verifiedRoleId, customerRoleId } = getDiscordConfig();
  let notInGuild = false;

  if (verifiedRoleId) {
    const res = await assignDiscordRole(user.discordId, verifiedRoleId);
    if (res.notInGuild) notInGuild = true;
  }

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
    const res = await assignDiscordRole(user.discordId, customerRoleId);
    if (res.notInGuild) notInGuild = true;
  }

  for (const order of completedOrders) {
    for (const item of order.items) {
      if (item.product?.discordRoleId) {
        await assignDiscordRole(user.discordId, item.product.discordRoleId);
      }
    }
  }

  return NextResponse.json({
    success: true,
    notInGuild,
    message: notInGuild
      ? "Conta vinculada, mas você ainda não entrou no nosso servidor do Discord. Entre para receber os cargos!"
      : "Cargos sincronizados com sucesso no Discord!",
  });
}
