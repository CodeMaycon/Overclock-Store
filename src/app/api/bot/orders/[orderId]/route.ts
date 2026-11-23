import { NextRequest, NextResponse } from "next/server";
import { requireBotAuth } from "@/lib/bot-auth";
import { prisma } from "@/lib/prisma";
import { releaseExpiredReservations } from "@/lib/reservation";

interface RouteParams {
  params: Promise<{ orderId: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const auth = requireBotAuth(req);
  if (!auth.authorized) return auth.response!;

  const { orderId } = await params;

  if (!orderId) {
    return NextResponse.json({ error: "orderId é obrigatório." }, { status: 400 });
  }

  // 1. Libera reservas expiradas caso o pedido ainda esteja pendente
  await releaseExpiredReservations();

  // 2. Busca o pedido com dados de pagamento e itens
  const order = await prisma.order.findFirst({
    where: {
      OR: [{ id: orderId }, { orderNumber: orderId }],
    },
    include: {
      items: {
        include: {
          product: { select: { name: true, slug: true } },
          variant: { select: { name: true, durationType: true } },
        },
      },
      payments: {
        take: 1,
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
  }

  const payment = order.payments[0];
  const expiresAt = payment?.pixExpiresAt?.toISOString() || new Date(order.createdAt.getTime() + 30 * 60 * 1000).toISOString();

  // 3. SEGURANÇA CRÍTICA: Se o status NÃO for COMPLETED, JAMAIS expõe a chave
  if (order.status !== "COMPLETED") {
    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      amountCents: order.totalCents,
      amountFormatted: `R$ ${(order.totalCents / 100).toFixed(2).replace(".", ",")}`,
      expiresAt,
      // Nenhuma licença ou chave incluída aqui!
    });
  }

  // 4. Se o status for COMPLETED, busca a chave de licença atribuída ao pedido
  const license = await prisma.licenseKey.findFirst({
    where: { orderId: order.id },
  });

  const primaryItem = order.items[0];

  return NextResponse.json({
    success: true,
    orderId: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    amountCents: order.totalCents,
    amountFormatted: `R$ ${(order.totalCents / 100).toFixed(2).replace(".", ",")}`,
    paidAt: order.paidAt?.toISOString() || order.updatedAt.toISOString(),
    expiresAt,
    license: {
      licenseKey: license?.key || "Chave em processamento",
      productName: primaryItem?.product?.name || "Software Overclock",
      variantName: primaryItem?.variant?.name || "Licença",
      instructions: "Ative sua chave de licença no Loader Oficial ou no Dashboard. Para dúvidas e suporte, abra um ticket no Discord: https://discord.gg/gqMDjvaSC",
      deliveredAt: (order.paidAt || order.updatedAt).toISOString(),
    },
  });
}
