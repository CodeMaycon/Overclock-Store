import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";

export async function GET() {
  const auth = await requireAdminSession();
  if (!auth.authorized) return auth.response!;

  try {
    // 1. Faturamento Total e Pedidos
    const completedOrders = await prisma.order.findMany({
      where: { status: "COMPLETED" },
      select: { totalCents: true },
    });

    const totalRevenueCents = completedOrders.reduce((acc, curr) => acc + curr.totalCents, 0);
    const completedOrdersCount = completedOrders.length;

    const pendingOrdersCount = await prisma.order.count({
      where: { status: "PENDING" },
    });

    // 2. Usuários
    const totalUsersCount = await prisma.user.count();
    const resellerCount = await prisma.user.count({
      where: { role: "RESELLER" },
    });

    // 3. Alertas de Estoque Baixo (produtos com menos de 3 chaves disponíveis)
    const productsWithStock = await prisma.product.findMany({
      where: { status: { not: "DISABLED" } },
      select: {
        id: true,
        name: true,
        slug: true,
        _count: {
          select: {
            licenseKeys: {
              where: { status: "UNASSIGNED" },
            },
          },
        },
      },
    });

    const lowStockAlerts = productsWithStock
      .filter((p) => p._count.licenseKeys < 5)
      .map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        availableKeys: p._count.licenseKeys,
        isCritical: p._count.licenseKeys === 0,
      }));

    // 4. Últimas Vendas (Real)
    const recentSales = await prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { username: true, email: true, fullName: true } },
        items: { include: { product: { select: { name: true } }, variant: { select: { name: true } } } },
        payments: { take: 1, orderBy: { createdAt: "desc" } },
      },
    });

    const formattedSales = recentSales.map((s) => ({
      id: s.id,
      orderNumber: s.orderNumber,
      customer: s.user?.fullName || s.user?.username || "Visitante",
      productSummary: s.items.map((i) => `${i.product.name} (${i.variant.name})`).join(", "),
      totalFormatted: `R$ ${(s.totalCents / 100).toFixed(2).replace(".", ",")}`,
      method: s.payments[0]?.method || "PIX",
      status: s.status,
      createdAt: s.createdAt,
    }));

    return NextResponse.json({
      success: true,
      metrics: {
        totalRevenueCents,
        totalRevenueFormatted: `R$ ${(totalRevenueCents / 100).toFixed(2).replace(".", ",")}`,
        completedOrdersCount,
        pendingOrdersCount,
        totalUsersCount,
        resellerCount,
      },
      lowStockAlerts,
      recentSales: formattedSales,
    });
  } catch (error: any) {
    console.error("[ADMIN_OVERVIEW_ERROR]", error);
    return NextResponse.json({ error: "Erro ao carregar telemetria geral." }, { status: 500 });
  }
}
