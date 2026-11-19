import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";

// GET /api/admin/orders - Histórico completo de vendas e pedidos reais do PostgreSQL
export async function GET() {
  const auth = await requireAdminSession();
  if (!auth.authorized) return auth.response!;

  try {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            fullName: true,
            discordId: true,
            discordUsername: true,
            isDiscordVerified: true,
          },
        },
        items: {
          include: {
            product: { select: { name: true, slug: true } },
            variant: { select: { name: true } },
          },
        },
        payments: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        licenseKeys: {
          select: { key: true, status: true },
        },
      },
    });

    const formatted = orders.map((ord) => {
      const payment = ord.payments?.[0];
      const primaryItem = ord.items?.[0];
      const productSummary = ord.items.map((it) => `${it.product?.name || "Software"} (${it.variant?.name || "Licença"})`).join(", ");

      const dateObj = new Date(ord.createdAt);
      const exactDate = dateObj.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      const exactTime = dateObj.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      return {
        id: ord.id,
        orderNumber: ord.orderNumber,
        createdAt: ord.createdAt,
        formattedDateTime: `${exactDate} às ${exactTime}`,
        status: ord.status,
        subtotalCents: ord.subtotalCents,
        discountCents: ord.discountCents,
        totalCents: ord.totalCents,
        totalFormatted: `R$ ${(ord.totalCents / 100).toFixed(2).replace(".", ",")}`,
        paymentMethod: payment?.method || "PIX",
        paymentGateway: payment?.gateway || "MERCADOPAGO",
        paymentStatus: payment?.status || ord.status,
        productSummary: productSummary || "Licença Digital Overclock",
        itemCount: ord.items.length,
        licenseKeyCount: ord.licenseKeys.length,
        user: ord.user ? {
          id: ord.user.id,
          username: ord.user.username,
          email: ord.user.email,
          fullName: ord.user.fullName,
          hasDiscord: Boolean(ord.user.discordId),
          discordId: ord.user.discordId,
          discordUsername: ord.user.discordUsername,
          isDiscordVerified: ord.user.isDiscordVerified,
        } : {
          id: "guest",
          username: "Visitante",
          email: "Checkout anônimo",
          fullName: "Cliente Anônimo",
          hasDiscord: false,
          discordId: null,
          discordUsername: null,
          isDiscordVerified: false,
        },
      };
    });

    return NextResponse.json({ success: true, orders: formatted });
  } catch (error: any) {
    console.error("[ADMIN_GET_ORDERS_ERROR]", error);
    return NextResponse.json(
      { error: "Erro ao buscar histórico de vendas do PostgreSQL." },
      { status: 500 }
    );
  }
}
