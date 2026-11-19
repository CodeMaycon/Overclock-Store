import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, orderAmountCents, userId } = body;

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { valid: false, error: "Código do cupom é obrigatório." },
        { status: 400 }
      );
    }

    const cleanCode = code.trim().toUpperCase();
    const coupon = await prisma.coupon.findUnique({
      where: { code: cleanCode },
    });

    if (!coupon) {
      return NextResponse.json(
        { valid: false, error: "Cupom não encontrado." },
        { status: 404 }
      );
    }

    const now = new Date();

    if (!coupon.isActive) {
      return NextResponse.json(
        { valid: false, error: "Este cupom foi desativado." },
        { status: 400 }
      );
    }

    if (coupon.validFrom > now) {
      return NextResponse.json(
        { valid: false, error: "Este cupom ainda não está ativo." },
        { status: 400 }
      );
    }

    if (coupon.validUntil && coupon.validUntil < now) {
      return NextResponse.json(
        { valid: false, error: "Este cupom expirou." },
        { status: 400 }
      );
    }

    // Valida limite total de utilizações contando apenas pedidos COMPLETED
    if (coupon.maxUses) {
      const completedTotal = await prisma.order.count({
        where: {
          couponId: coupon.id,
          status: "COMPLETED",
        },
      });

      if (completedTotal >= coupon.maxUses) {
        return NextResponse.json(
          { valid: false, error: "O limite de utilizações deste cupom foi atingido." },
          { status: 400 }
        );
      }
    }

    const amount = Number(orderAmountCents) || 0;
    if (coupon.minOrderCents && amount < coupon.minOrderCents) {
      const minFormatted = (coupon.minOrderCents / 100).toFixed(2).replace(".", ",");
      return NextResponse.json(
        { valid: false, error: `Valor mínimo para este cupom é de R$ ${minFormatted}.` },
        { status: 400 }
      );
    }

    // Valida limite por usuário contando apenas pedidos COMPLETED (nunca bloqueia quem abandonou checkout anterior)
    if (coupon.maxUsesPerUser && (userId || body.email)) {
      const userFilters: any[] = [];
      if (userId) userFilters.push({ userId });
      if (body.email) userFilters.push({ user: { email: body.email.trim().toLowerCase() } });

      const userUsageCount = await prisma.order.count({
        where: {
          couponId: coupon.id,
          status: "COMPLETED",
          OR: userFilters,
        },
      });

      if (userUsageCount >= coupon.maxUsesPerUser) {
        return NextResponse.json(
          { valid: false, error: "Você já atingiu o limite de usos deste cupom." },
          { status: 400 }
        );
      }
    }

    // Calcula desconto
    let discountCents = 0;
    if (coupon.discountType === "PERCENTAGE") {
      discountCents = Math.round((amount * coupon.discountValue) / 100);
    } else {
      // FIXED_AMOUNT em centavos
      discountCents = Math.min(coupon.discountValue, amount);
    }

    const finalAmountCents = Math.max(0, amount - discountCents);

    return NextResponse.json({
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
      },
      discountCents,
      finalAmountCents,
    });
  } catch (error: any) {
    console.error("[VALIDATE_COUPON_ERROR]", error);
    return NextResponse.json(
      { valid: false, error: "Erro interno ao validar cupom." },
      { status: 500 }
    );
  }
}
