import { NextRequest, NextResponse } from "next/server";
import { requireClientSession } from "@/lib/client-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireClientSession();
    if (!auth.authorized) return auth.response!;

    const orders = await prisma.order.findMany({
      where: { userId: auth.userId! },
      include: {
        items: {
          include: {
            product: { select: { name: true, slug: true, category: true } },
            variant: { select: { name: true } },
          },
        },
        payments: {
          select: {
            method: true,
            gateway: true,
            status: true,
          },
          take: 1,
          orderBy: { createdAt: "desc" },
        },
        reviews: {
          select: {
            id: true,
            rating: true,
            isApproved: true,
            createdAt: true,
          },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = orders.map((ord) => {
      const primaryItem = ord.items[0];
      const payment = ord.payments[0];
      const review = ord.reviews[0];

      return {
        id: ord.id,
        orderNumber: ord.orderNumber,
        status: ord.status,
        productName: primaryItem ? primaryItem.product.name : "Licença de Software",
        productSlug: primaryItem ? primaryItem.product.slug : "",
        productId: primaryItem ? primaryItem.productId : null,
        variantName: primaryItem ? primaryItem.variant.name : "",
        amountCents: ord.totalCents,
        amountFormatted: `R$ ${(ord.totalCents / 100).toFixed(2).replace(".", ",")}`,
        paymentMethod: payment?.method || "PIX",
        createdAt: ord.createdAt.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        paidAt: ord.paidAt,
        hasReview: !!review,
        reviewStatus: review ? (review.isApproved ? "PUBLISHED" : "PENDING") : null,
        reviewRating: review?.rating || null,
      };
    });

    return NextResponse.json({ success: true, orders: formatted });
  } catch (error: any) {
    console.error("[GET_CLIENT_ORDERS_ERROR]", error);
    return NextResponse.json({ error: "Erro ao buscar histórico de pedidos." }, { status: 500 });
  }
}
