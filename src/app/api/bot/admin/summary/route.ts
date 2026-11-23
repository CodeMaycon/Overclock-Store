import { NextRequest, NextResponse } from "next/server";
import { requireBotAuth } from "@/lib/bot-auth";
import { prisma } from "@/lib/prisma";
import { releaseExpiredReservations } from "@/lib/reservation";
import { KeyStatus, OrderStatus, ProductStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  const auth = requireBotAuth(req);
  if (!auth.authorized) return auth.response!;

  try {
    // 1. Libera reservas pendentes expiradas antes do cálculo
    await releaseExpiredReservations();

    // 2. Cálculo dos períodos com fuso America/Sao_Paulo
    const now = new Date();
    // Ex: "2026-11-23" no fuso de São Paulo
    const spDateStr = now.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
    const startOfToday = new Date(`${spDateStr}T00:00:00-03:00`);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 3. Vendas concluídas
    const [todayOrders, last7DaysOrders, last30DaysOrders] = await Promise.all([
      prisma.order.findMany({
        where: {
          status: OrderStatus.COMPLETED,
          createdAt: { gte: startOfToday },
        },
        select: { totalCents: true },
      }),
      prisma.order.findMany({
        where: {
          status: OrderStatus.COMPLETED,
          createdAt: { gte: sevenDaysAgo },
        },
        select: { totalCents: true },
      }),
      prisma.order.findMany({
        where: {
          status: OrderStatus.COMPLETED,
          createdAt: { gte: thirtyDaysAgo },
        },
        select: { totalCents: true },
      }),
    ]);

    const sumCents = (orders: { totalCents: number }[]) =>
      orders.reduce((acc, curr) => acc + curr.totalCents, 0);

    const formatBrl = (cents: number) =>
      `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;

    const todayTotal = sumCents(todayOrders);
    const last7DaysTotal = sumCents(last7DaysOrders);
    const last30DaysTotal = sumCents(last30DaysOrders);

    // 4. Pedidos pendentes
    const pendingOrdersCount = await prisma.order.count({
      where: { status: OrderStatus.PENDING },
    });

    // 5. Variantes ativas com estoque baixo (<= 3)
    const activeVariants = await prisma.productVariant.findMany({
      where: {
        isActive: true,
        product: {
          status: { not: ProductStatus.DISABLED },
        },
      },
      include: {
        product: { select: { id: true, name: true, slug: true, status: true } },
      },
      orderBy: { orderPriority: "asc" },
    });

    const lowStockVariants = await Promise.all(
      activeVariants.map(async (v) => {
        const count = await prisma.licenseKey.count({
          where: {
            variantId: v.id,
            status: KeyStatus.UNASSIGNED,
          },
        });
        return {
          id: v.id,
          productName: v.product.name,
          productSlug: v.product.slug,
          variantName: v.name,
          priceFormatted: formatBrl(v.priceCents),
          stock: count,
          isZeroStock: count === 0,
        };
      })
    );

    // Filtra apenas as com estoque <= 3 e ordena: zeradas primeiro, depois pelo menor estoque
    const filteredLowStock = lowStockVariants
      .filter((v) => v.stock <= 3)
      .sort((a, b) => a.stock - b.stock);

    return NextResponse.json({
      success: true,
      today: {
        count: todayOrders.length,
        totalCents: todayTotal,
        totalFormatted: formatBrl(todayTotal),
      },
      last7Days: {
        count: last7DaysOrders.length,
        totalCents: last7DaysTotal,
        totalFormatted: formatBrl(last7DaysTotal),
      },
      last30Days: {
        count: last30DaysOrders.length,
        totalCents: last30DaysTotal,
        totalFormatted: formatBrl(last30DaysTotal),
      },
      pendingOrdersCount,
      lowStockVariants: filteredLowStock,
    });
  } catch (error: any) {
    console.error("[BOT_ADMIN_SUMMARY_ERROR]", error);
    return NextResponse.json(
      { error: "Erro ao gerar resumo operacional.", details: error?.message },
      { status: 500 }
    );
  }
}
