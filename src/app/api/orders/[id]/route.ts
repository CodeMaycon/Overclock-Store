import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { releaseExpiredReservations } from "@/lib/reservation";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const resolved = await params;
    const orderId = resolved.id;

    // Libera reservas expiradas
    await releaseExpiredReservations();

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
        payments: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            email: true,
            isDiscordVerified: true,
            discordUsername: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
    }

    const latestPayment = order.payments[0] || null;

    // Se o pedido estiver COMPLETED, busca a chave de licença atribuída
    let deliveredKey: string | null = null;
    let licenseStatus: string | null = null;

    if (order.status === "COMPLETED") {
      const license = await prisma.licenseKey.findFirst({
        where: { orderId: order.id },
      });
      if (license) {
        deliveredKey = license.key;
        licenseStatus = license.status;
      }
    }

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        subtotalCents: order.subtotalCents,
        discountCents: order.discountCents,
        totalCents: order.totalCents,
        createdAt: order.createdAt,
        paidAt: order.paidAt,
        cancelledAt: order.cancelledAt,
        items: order.items.map((item) => ({
          id: item.id,
          productName: item.product.name,
          productSlug: item.product.slug,
          category: item.product.category,
          variantName: item.variant.name,
          durationValue: item.variant.durationValue,
          durationType: item.variant.durationType,
          unitPriceCents: item.unitPriceCents,
          downloadUrl: item.product.downloadFileUrl,
        })),
        payment: latestPayment
          ? {
              id: latestPayment.id,
              gateway: latestPayment.gateway,
              method: latestPayment.method,
              status: latestPayment.status,
              checkoutUrl: latestPayment.checkoutUrl,
              pixQrCode: latestPayment.pixQrCode,
              pixQrCodeText: latestPayment.pixQrCodeText,
              pixExpiresAt: latestPayment.pixExpiresAt,
              cryptoAddress: latestPayment.cryptoAddress,
              isSandbox: latestPayment.gatewayPaymentId.startsWith("SANDBOX"),
            }
          : null,
        deliveredKey,
        licenseStatus,
        customer: order.user,
      },
    });
  } catch (error: any) {
    console.error("[GET_ORDER_ERROR]", error);
    return NextResponse.json({ error: "Erro ao buscar pedido." }, { status: 500 });
  }
}
