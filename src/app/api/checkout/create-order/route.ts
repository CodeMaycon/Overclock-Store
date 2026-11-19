import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { releaseExpiredReservations } from "@/lib/reservation";
import { PaymentService } from "@/services/payment.service";
import { PaymentGateway, PaymentMethod, PaymentStatus, OrderStatus, KeyStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      variantId,
      gateway = "MERCADOPAGO",
      method = "PIX",
      couponCode,
      // Dados para visitante não autenticado
      email,
      fullName,
      username,
      password,
    } = body;

    if (!variantId) {
      return NextResponse.json(
        { error: "O identificador da variante é obrigatório." },
        { status: 400 }
      );
    }

    // 1. Identificar ou Criar Usuário
    const session = await getServerSession(authOptions);
    let userId = session?.user?.id;
    let customerEmail = session?.user?.email || email;
    let customerName = session?.user?.name || fullName || "Cliente Overclock";

    if (!userId) {
      if (!email) {
        return NextResponse.json(
          { error: "É necessário estar autenticado ou informar um endereço de e-mail válido." },
          { status: 400 }
        );
      }

      const cleanEmail = email.trim().toLowerCase();
      const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
      if (!EMAIL_REGEX.test(cleanEmail)) {
        return NextResponse.json(
          { error: "Endereço de e-mail inválido. Informe um formato válido (ex: seu_nome@dominio.com)." },
          { status: 400 }
        );
      }

      let existingUser = await prisma.user.findUnique({
        where: { email: cleanEmail },
      });

      if (!existingUser) {
        const baseUsername = username && username.trim().length >= 3
          ? username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "")
          : cleanEmail.split("@")[0].replace(/[^a-z0-9_]/g, "");

        const cleanUsername = baseUsername.length >= 3 ? baseUsername : `user_${Math.floor(1000 + Math.random() * 9000)}`;

        if (cleanUsername.length < 3) {
          return NextResponse.json(
            { error: "O nome de usuário deve conter no mínimo 3 caracteres válidos." },
            { status: 400 }
          );
        }

        if (password && password.trim().length < 6) {
          return NextResponse.json(
            { error: "A senha de acesso deve conter no mínimo 6 caracteres." },
            { status: 400 }
          );
        }

        // Se o username já estiver em uso por outro usuário, anexa sufixo numérico
        const usernameTaken = await prisma.user.findFirst({
          where: { username: cleanUsername },
        });

        const finalUsername = usernameTaken ? `${cleanUsername}_${Math.floor(100 + Math.random() * 900)}` : cleanUsername;
        const defaultPassword = password && password.trim().length >= 6 ? password.trim() : "overclock2026";
        const hash = await bcrypt.hash(defaultPassword, 10);

        existingUser = await prisma.user.create({
          data: {
            email: cleanEmail,
            username: finalUsername,
            fullName: fullName ? fullName.trim() : finalUsername,
            passwordHash: hash,
            role: "CUSTOMER",
          },
        });
      }

      userId = existingUser.id;
      customerEmail = existingUser.email;
      customerName = existingUser.fullName;
    }

    // 2. Libera reservas expiradas antes do lock
    await releaseExpiredReservations();

    // 3. Captura IP e User Agent
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0] : req.headers.get("x-real-ip") || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || undefined;

    // 4. Busca produto e variante
    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      include: { product: true },
    });

    if (!variant || !variant.isActive || variant.product.status === "DISABLED") {
      return NextResponse.json(
        { error: "Variante de produto indisponível ou inativa." },
        { status: 404 }
      );
    }

    const appUrl = process.env.NEXTAUTH_URL || `http://${req.headers.get("host") || "localhost:3001"}`;

    // 5. Transação Atômica com Lock Postgres Real (FOR UPDATE SKIP LOCKED)
    const result = await prisma.$transaction(async (tx) => {
      // LOCK ATÔMICO NO POSTGRESQL
      const lockedKeys: { id: string }[] = await tx.$queryRaw`
        SELECT id FROM "LicenseKey" 
        WHERE "variantId" = ${variant.id} 
          AND status = 'UNASSIGNED' 
        LIMIT 1 
        FOR UPDATE SKIP LOCKED
      `;

      if (!lockedKeys || lockedKeys.length === 0) {
        throw new Error("OUT_OF_STOCK");
      }

      const keyIdToReserve = lockedKeys[0].id;

      // Validação de Cupom
      let couponId: string | null = null;
      let discountCents = 0;

      if (couponCode) {
        const cleanCoupon = String(couponCode).trim().toUpperCase();
        const foundCoupon = await tx.coupon.findUnique({
          where: { code: cleanCoupon },
        });

        const now = new Date();
        if (
          foundCoupon &&
          foundCoupon.isActive &&
          foundCoupon.validFrom <= now &&
          (!foundCoupon.validUntil || foundCoupon.validUntil >= now) &&
          (!foundCoupon.maxUses || foundCoupon.usedCount < foundCoupon.maxUses) &&
          (!foundCoupon.minOrderCents || variant.priceCents >= foundCoupon.minOrderCents)
        ) {
          couponId = foundCoupon.id;
          if (foundCoupon.discountType === "PERCENTAGE") {
            discountCents = Math.round((variant.priceCents * foundCoupon.discountValue) / 100);
          } else {
            discountCents = Math.min(foundCoupon.discountValue, variant.priceCents);
          }
        }
      }

      const totalCents = Math.max(0, variant.priceCents - discountCents);
      const orderNumber = `ORD-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

      // Criação do Pedido
      const order = await tx.order.create({
        data: {
          orderNumber,
          userId,
          status: OrderStatus.PENDING,
          subtotalCents: variant.priceCents,
          discountCents,
          totalCents,
          couponId,
          customerIp: ip,
          userAgent,
        },
      });

      // Item do Pedido
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

      // Atualiza a Chave para RESERVED com janela de 15 minutos
      const reservedUntil = new Date(Date.now() + 15 * 60 * 1000);
      await tx.licenseKey.update({
        where: { id: keyIdToReserve },
        data: {
          status: KeyStatus.RESERVED,
          reservedUntil,
          orderId: order.id,
        },
      });

      // Inicializa Gateway de Pagamento
      const paymentGatewayType =
        gateway === "STRIPE"
          ? PaymentGateway.STRIPE
          : gateway === "CRYPTO"
          ? PaymentGateway.CRYPTO
          : PaymentGateway.MERCADOPAGO;

      const paymentMethodType =
        method === "CREDIT_CARD"
          ? PaymentMethod.CREDIT_CARD
          : method === "CRYPTO"
          ? PaymentMethod.CRYPTO
          : PaymentMethod.PIX;

      const gatewayResult = await PaymentService.createPayment({
        orderId: order.id,
        orderNumber: order.orderNumber,
        amountCents: totalCents,
        customerEmail,
        customerName,
        gateway: gateway as any,
        method: method as any,
        appUrl,
      });

      // Cria registro de pagamento
      const payment = await tx.payment.create({
        data: {
          orderId: order.id,
          gateway: paymentGatewayType,
          gatewayPaymentId: gatewayResult.gatewayPaymentId,
          status: PaymentStatus.PENDING,
          method: paymentMethodType,
          amountCents: totalCents,
          checkoutUrl: gatewayResult.checkoutUrl,
          pixQrCode: gatewayResult.pixQrCode,
          pixQrCodeText: gatewayResult.pixQrCodeText,
          pixExpiresAt: gatewayResult.pixExpiresAt,
          cryptoAddress: gatewayResult.cryptoAddress,
        },
      });

      return {
        orderId: order.id,
        orderNumber: order.orderNumber,
        totalCents,
        gatewayResult,
        reservedUntil,
      };
    });

    return NextResponse.json({
      success: true,
      orderId: result.orderId,
      orderNumber: result.orderNumber,
      totalCents: result.totalCents,
      checkoutUrl: result.gatewayResult.checkoutUrl,
      pixQrCode: result.gatewayResult.pixQrCode,
      pixQrCodeText: result.gatewayResult.pixQrCodeText,
      cryptoAddress: result.gatewayResult.cryptoAddress,
      isSandbox: result.gatewayResult.isSandbox,
      reservedUntil: result.reservedUntil,
    }, { status: 201 });
  } catch (error: any) {
    if (error.message === "OUT_OF_STOCK") {
      return NextResponse.json(
        {
          error: "Estoque esgotado para esta variante no momento. Tente novamente mais tarde.",
          outOfStock: true,
        },
        { status: 409 }
      );
    }

    console.error("[CHECKOUT_CREATE_ORDER_ERROR]", error);
    return NextResponse.json(
      { error: "Erro ao processar checkout e reserva de estoque." },
      { status: 500 }
    );
  }
}
