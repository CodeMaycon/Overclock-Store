import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";
import { KeyStatus, OrderStatus, PaymentStatus, PaymentGateway, PaymentMethod, ActorType } from "@prisma/client";
import crypto from "crypto";

// POST /api/admin/licenses/grant-free - Atribui chave/licença gratuita a um cliente (sorteio, promoção, teste)
export async function POST(req: NextRequest) {
  const auth = await requireAdminSession();
  if (!auth.authorized) return auth.response!;

  try {
    const body = await req.json().catch(() => ({}));
    const { userId, email, productId, variantId, reason = "Sorteio / Brinde Administrativo" } = body;

    if ((!userId && !email) || !productId) {
      return NextResponse.json(
        { error: "Cliente (ID ou E-mail) e Produto são obrigatórios." },
        { status: 400 }
      );
    }

    // 1. Localiza cliente
    const user = await prisma.user.findFirst({
      where: userId ? { id: userId } : { email: { equals: email.trim(), mode: "insensitive" } },
    });

    if (!user) {
      return NextResponse.json({ error: "Cliente não encontrado no sistema." }, { status: 404 });
    }

    // 2. Localiza produto e variante
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { variants: { orderBy: { orderPriority: "asc" } } },
    });

    if (!product) {
      return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
    }

    const targetVariant = variantId
      ? product.variants.find((v) => v.id === variantId)
      : product.variants[0];

    if (!targetVariant) {
      return NextResponse.json({ error: "Variante/plano não encontrado para este produto." }, { status: 400 });
    }

    // 3. Executa atribuição atômica no PostgreSQL
    const result = await prisma.$transaction(async (tx) => {
      // Localiza chave UNASSIGNED disponível ou gera uma nova de cortesia
      let licenseKey = await tx.licenseKey.findFirst({
        where: {
          productId: product.id,
          variantId: targetVariant.id,
          status: KeyStatus.UNASSIGNED,
        },
      });

      if (!licenseKey) {
        // Gera chave automática caso não haja chaves pré-carregadas no estoque
        const randomSegment = () => crypto.randomBytes(2).toString("hex").toUpperCase();
        const generatedKey = `OVLK-${randomSegment()}-${randomSegment()}-${randomSegment()}`;

        licenseKey = await tx.licenseKey.create({
          data: {
            key: generatedKey,
            productId: product.id,
            variantId: targetVariant.id,
            status: KeyStatus.UNASSIGNED,
          },
        });
      }

      // Cria pedido de cortesia
      const orderNumber = `GIFT-${Math.floor(100000 + Math.random() * 900000)}`;
      const order = await tx.order.create({
        data: {
          orderNumber,
          userId: user.id,
          status: OrderStatus.COMPLETED,
          subtotalCents: targetVariant.priceCents,
          discountCents: targetVariant.priceCents,
          totalCents: 0,
          paidAt: new Date(),
        },
      });

      // Cria item do pedido
      await tx.orderItem.create({
        data: {
          orderId: order.id,
          productId: product.id,
          variantId: targetVariant.id,
          quantity: 1,
          unitPriceCents: 0,
          totalPriceCents: 0,
        },
      });

      // Cria registro de pagamento de cortesia
      await tx.payment.create({
        data: {
          orderId: order.id,
          gateway: PaymentGateway.MERCADOPAGO,
          gatewayPaymentId: `FREE-${order.id}-${Date.now()}`,
          status: PaymentStatus.PAID,
          method: PaymentMethod.PIX,
          amountCents: 0,
          paidAt: new Date(),
        },
      });

      // Vincula a chave ao cliente
      const assignedKey = await tx.licenseKey.update({
        where: { id: licenseKey.id },
        data: {
          userId: user.id,
          orderId: order.id,
          status: KeyStatus.NOT_ACTIVATED,
          reservedUntil: null,
        },
      });

      // Registra Auditoria
      await tx.auditLog.create({
        data: {
          userId: auth.session!.user.id,
          actorType: ActorType.ADMIN,
          action: "GIFT_LICENSE_ASSIGNED",
          entityType: "LicenseKey",
          entityId: assignedKey.id,
          metadata: {
            recipientId: user.id,
            recipientUsername: user.username,
            recipientEmail: user.email,
            productId: product.id,
            productName: product.name,
            variantId: targetVariant.id,
            variantName: targetVariant.name,
            key: assignedKey.key,
            orderNumber: order.orderNumber,
            reason,
          },
        },
      });

      return { order, assignedKey };
    });

    return NextResponse.json({
      success: true,
      message: `Licença de "${product.name} (${targetVariant.name})" concedida com sucesso para @${user.username}!`,
      key: result.assignedKey.key,
      orderNumber: result.order.orderNumber,
    });
  } catch (error: any) {
    console.error("[ADMIN_GRANT_FREE_LICENSE_ERROR]", error);
    return NextResponse.json({ error: "Erro ao atribuir licença gratuita." }, { status: 500 });
  }
}
