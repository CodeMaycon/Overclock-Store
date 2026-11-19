import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";
import { DiscountType, ActorType } from "@prisma/client";

export async function GET() {
  const auth = await requireAdminSession();
  if (!auth.authorized) return auth.response!;

  try {
    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, coupons });
  } catch (error: any) {
    return NextResponse.json({ error: "Erro ao buscar cupons." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminSession();
  if (!auth.authorized) return auth.response!;

  try {
    const body = await req.json();
    const {
      code,
      discountType = "PERCENTAGE",
      discountValue,
      minOrderValueCents = 0,
      maxUses = null,
      maxUsesPerUser = 1,
      expiresAt = null,
      isActive = true,
    } = body;

    if (!code || !discountValue) {
      return NextResponse.json(
        { error: "Código do cupom e valor do desconto são obrigatórios." },
        { status: 400 }
      );
    }

    const cleanCode = String(code).trim().toUpperCase();
    const parsedValue = parseInt(String(discountValue), 10);

    const existing = await prisma.coupon.findUnique({
      where: { code: cleanCode },
    });

    if (existing) {
      return NextResponse.json({ error: "Já existe um cupom com este código." }, { status: 409 });
    }

    const created = await prisma.coupon.create({
      data: {
        code: cleanCode,
        discountType: discountType as DiscountType,
        discountValue: parsedValue,
        minOrderCents: Number(minOrderValueCents) || 0,
        maxUses: maxUses ? Number(maxUses) : null,
        maxUsesPerUser: Number(maxUsesPerUser) || 1,
        validUntil: expiresAt ? new Date(expiresAt) : null,
        isActive: Boolean(isActive),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: auth.session!.user.id,
        actorType: ActorType.ADMIN,
        action: "COUPON_CREATED",
        entityType: "Coupon",
        entityId: created.id,
        metadata: { code: cleanCode, discountType, discountValue: parsedValue },
      },
    });

    return NextResponse.json({ success: true, coupon: created });
  } catch (error: any) {
    console.error("[ADMIN_COUPON_POST_ERROR]", error);
    return NextResponse.json({ error: "Erro ao cadastrar cupom." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdminSession();
  if (!auth.authorized) return auth.response!;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID obrigatório." }, { status: 400 });
    }

    const deleted = await prisma.coupon.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: `Cupom ${deleted.code} excluído.` });
  } catch (error: any) {
    return NextResponse.json({ error: "Erro ao excluir cupom." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdminSession();
  if (!auth.authorized) return auth.response!;

  try {
    const body = await req.json();
    const { id, isActive } = body;

    if (!id || isActive === undefined) {
      return NextResponse.json({ error: "ID e isActive são obrigatórios." }, { status: 400 });
    }

    const updated = await prisma.coupon.update({
      where: { id },
      data: { isActive: Boolean(isActive) },
    });

    return NextResponse.json({ success: true, coupon: updated });
  } catch (error: any) {
    return NextResponse.json({ error: "Erro ao alternar status do cupom." }, { status: 500 });
  }
}
