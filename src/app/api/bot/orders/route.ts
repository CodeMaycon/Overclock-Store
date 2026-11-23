import { NextRequest, NextResponse } from "next/server";
import { requireBotAuth } from "@/lib/bot-auth";
import { prisma } from "@/lib/prisma";
import { releaseExpiredReservations } from "@/lib/reservation";
import { PaymentService } from "@/services/payment.service";
import { PaymentGateway, PaymentMethod, PaymentStatus, OrderStatus, KeyStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const auth = requireBotAuth(req);
  if (!auth.authorized) return auth.response!;

  try {
    const body = await req.json().catch(() => ({}));
    const {
      discordId,
      discordUsername,
      productId,
      variantId,
      email,
    } = body;

    if (!variantId && !productId) {
      return NextResponse.json(
        { error: "É obrigatório fornecer variantId ou productId." },
        { status: 400 }
      );
    }

    if (!discordId) {
      return NextResponse.json(
        { error: "discordId é obrigatório para pedidos gerados pelo Bot." },
        { status: 400 }
      );
    }

    // 1. Identificar ou Criar Usuário vinculado ao Discord
    let user = await prisma.user.findFirst({
      where: { discordId: String(discordId) },
    });

    if (!user && email) {
      const cleanEmail = String(email).trim().toLowerCase();
      user = await prisma.user.findUnique({
        where: { email: cleanEmail },
      });

      // Se encontrou por e-mail e não tem discordId vinculado, vincula agora
      if (user && !user.discordId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            discordId: String(discordId),
            discordUsername: discordUsername || user.discordUsername,
            discordLinkedAt: new Date(),
            isDiscordVerified: true,
          },
        });
      }
    }

    if (!user) {
      // Cria novo usuário para o membro do Discord
      const cleanDiscordUser = (discordUsername || `discord_${discordId}`)
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "");
      const finalUsername = cleanDiscordUser.length >= 3
        ? cleanDiscordUser
        : `user_${Math.floor(1000 + Math.random() * 9000)}`;

      // Evita colisão de username
      const existingName = await prisma.user.findFirst({ where: { username: finalUsername } });
      const safeUsername = existingName
        ? `${finalUsername}_${Math.floor(100 + Math.random() * 900)}`
        : finalUsername;

      const fallbackEmail = email && email.includes("@")
        ? String(email).trim().toLowerCase()
        : `${discordId}@discord.overclockstore.com`;

      const hash = await bcrypt.hash("overclock2026", 10);

      user = await prisma.user.create({
        data: {
          email: fallbackEmail,
          username: safeUsername,
          fullName: discordUsername || `Discord ${discordId}`,
          passwordHash: hash,
          discordId: String(discordId),
          discordUsername: discordUsername || safeUsername,
          discordLinkedAt: new Date(),
          isDiscordVerified: true,
          role: "CUSTOMER",
        },
      });
    }

    // 2. Libera reservas expiradas antes do lock
    await releaseExpiredReservations();

    // 3. Localiza variante
    let variant = null;
    if (variantId) {
      variant = await prisma.productVariant.findUnique({
        where: { id: variantId },
        include: { product: true },
      });
    } else if (productId) {
      // Pega a primeira variante ativa do produto
      variant = await prisma.productVariant.findFirst({
        where: { productId, isActive: true },
        include: { product: true },
        orderBy: { orderPriority: "asc" },
      });
    }

    if (!variant || !variant.isActive || variant.product.status === "DISABLED") {
      return NextResponse.json(
        { error: "Produto ou variante indisponível no momento." },
        { status: 404 }
      );
    }

    const host = req.headers.get("host") || "localhost:3001";
    const protocol = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || `${protocol}://${host}`;

    // 4. Transação Atômica com Lock Postgres Real (FOR UPDATE SKIP LOCKED)
    const result = await prisma.$transaction(async (tx) => {
      const lockedKeys: { id: string }[] = await tx.$queryRaw`
        SELECT id FROM "LicenseKey" 
        WHERE ("variantId" = ${variant.id} OR ("productId" = ${variant.productId} AND "variantId" IS NULL)) 
          AND status = 'UNASSIGNED' 
        ORDER BY CASE WHEN "variantId" = ${variant.id} THEN 0 ELSE 1 END, "createdAt" ASC
        LIMIT 1 
        FOR UPDATE SKIP LOCKED
      `;

      if (!lockedKeys || lockedKeys.length === 0) {
        throw new Error("OUT_OF_STOCK");
      }

      const keyIdToReserve = lockedKeys[0].id;
      const totalCents = variant.priceCents;
      const orderNumber = `ORD-BOT-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

      // Cria pedido PENDING
      const order = await tx.order.create({
        data: {
          orderNumber,
          userId: user.id,
          status: OrderStatus.PENDING,
          subtotalCents: variant.priceCents,
          discountCents: 0,
          totalCents,
          customerIp: req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1",
          userAgent: "Overclock-Discord-Bot/1.0",
        },
      });

      // Cria item do pedido
      await tx.orderItem.create({
        data: {
          orderId: order.id,
          productId: variant.productId,
          variantId: variant.id,
          quantity: 1,
          unitPriceCents: variant.priceCents,
          totalPriceCents: variant.priceCents,
        },
      });

      // Reserva a chave por 30 minutos
      const reservedUntil = new Date(Date.now() + 30 * 60 * 1000);
      await tx.licenseKey.update({
        where: { id: keyIdToReserve },
        data: {
          status: KeyStatus.RESERVED,
          reservedUntil,
          orderId: order.id,
          variantId: variant.id,
        },
      });

      // Inicializa cobrança Pix no Mercado Pago
      const gatewayResult = await PaymentService.createPayment({
        orderId: order.id,
        orderNumber: order.orderNumber,
        amountCents: totalCents,
        customerEmail: user.email,
        customerName: user.fullName,
        gateway: "MERCADOPAGO",
        method: "PIX",
        appUrl,
      });

      // Registra pagamento
      await tx.payment.create({
        data: {
          orderId: order.id,
          gateway: PaymentGateway.MERCADOPAGO,
          gatewayPaymentId: gatewayResult.gatewayPaymentId,
          status: PaymentStatus.PENDING,
          method: PaymentMethod.PIX,
          amountCents: totalCents,
          checkoutUrl: gatewayResult.checkoutUrl,
          pixQrCode: gatewayResult.pixQrCode,
          pixQrCodeText: gatewayResult.pixQrCodeText,
          pixExpiresAt: gatewayResult.pixExpiresAt || reservedUntil,
        },
      });

      return {
        orderId: order.id,
        orderNumber: order.orderNumber,
        amount: totalCents,
        amountFormatted: `R$ ${(totalCents / 100).toFixed(2).replace(".", ",")}`,
        status: order.status,
        pixQrCode: gatewayResult.pixQrCodeText, // Código copia e cola
        pixQrCodeBase64: gatewayResult.pixQrCode, // Imagem QR Code Base64
        expiresAt: reservedUntil.toISOString(),
      };
    });

    return NextResponse.json({
      success: true,
      orderId: result.orderId,
      orderNumber: result.orderNumber,
      amount: result.amount,
      amountFormatted: result.amountFormatted,
      status: result.status,
      pixQrCode: result.pixQrCode,
      pixQrCodeBase64: result.pixQrCodeBase64,
      expiresAt: result.expiresAt,
    });
  } catch (error: any) {
    if (error?.message === "OUT_OF_STOCK") {
      return NextResponse.json(
        { error: "Produto esgotado no momento. Não há chaves disponíveis para reserva." },
        { status: 409 }
      );
    }
    console.error("[BOT_CREATE_ORDER_ERROR]", error);
    return NextResponse.json(
      { error: "Falha ao gerar pedido para o bot.", details: error?.message },
      { status: 500 }
    );
  }
}
