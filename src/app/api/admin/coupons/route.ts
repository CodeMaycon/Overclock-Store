import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";
import { DiscountType, ActorType } from "@prisma/client";

export async function GET() {
  const auth = await requireAdminSession();
  if (!auth.authorized) return auth.response!;

  try {
    const rawCoupons = await prisma.coupon.findMany({
      orderBy: { createdAt: "desc" },
    });

    const coupons = rawCoupons.map((c) => ({
      ...c,
      active: c.isActive,
      minOrderAmountCents: c.minOrderCents,
      discountPercent: c.discountType === "PERCENTAGE" ? c.discountValue : null,
      discountAmountCents: c.discountType === "FIXED" ? c.discountValue : null,
    }));

    return NextResponse.json({ success: true, coupons });
  } catch (error: any) {
    console.error("[ADMIN_COUPONS_GET_ERROR]", error);
    return NextResponse.json({ error: "Erro ao buscar cupons." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminSession();
  if (!auth.authorized) return auth.response!;

  try {
    const body = await req.json();

    const rawCode = body.code || "";
    const cleanCode = String(rawCode).trim().toUpperCase();

    if (!cleanCode) {
      return NextResponse.json(
        { error: "Código do cupom é obrigatório." },
        { status: 400 }
      );
    }

    // Determina o tipo de desconto (PERCENTAGE ou FIXED)
    let discountType: DiscountType = DiscountType.PERCENTAGE;
    const rawType = String(body.discountType || body.type || "").toUpperCase();
    if (rawType === "FIXED" || body.discountAmountCents !== undefined) {
      discountType = DiscountType.FIXED;
    } else {
      discountType = DiscountType.PERCENTAGE;
    }

    // Extrai o valor do desconto de qualquer uma das propriedades enviadas
    let parsedValue = 0;
    if (body.discountValue !== undefined && body.discountValue !== null && body.discountValue !== "") {
      parsedValue = Math.round(Number(body.discountValue));
    } else if (discountType === DiscountType.PERCENTAGE && body.discountPercent !== undefined && body.discountPercent !== null) {
      parsedValue = Math.round(Number(body.discountPercent));
    } else if (discountType === DiscountType.FIXED && body.discountAmountCents !== undefined && body.discountAmountCents !== null) {
      parsedValue = Math.round(Number(body.discountAmountCents));
    }

    if (!parsedValue || parsedValue <= 0 || isNaN(parsedValue)) {
      return NextResponse.json(
        { error: "Valor do desconto deve ser um número maior que zero." },
        { status: 400 }
      );
    }

    if (discountType === DiscountType.PERCENTAGE && parsedValue > 100) {
      return NextResponse.json(
        { error: "O desconto percentual não pode ser maior que 100%." },
        { status: 400 }
      );
    }

    // Trata pedido mínimo (em centavos)
    let minOrderCents = 0;
    const rawMin = body.minOrderCents ?? body.minOrderValueCents ?? body.minOrderAmountCents;
    if (rawMin !== undefined && rawMin !== null && rawMin !== "") {
      minOrderCents = Math.max(0, Math.round(Number(rawMin)) || 0);
    }

    // Trata limite de utilizações (null = ilimitado)
    let maxUses: number | null = null;
    if (body.maxUses !== undefined && body.maxUses !== null && body.maxUses !== "") {
      const parsedMax = parseInt(String(body.maxUses), 10);
      if (!isNaN(parsedMax) && parsedMax > 0) {
        maxUses = parsedMax;
      }
    }

    // Trata limite por usuário
    let maxUsesPerUser = 1;
    if (body.maxUsesPerUser !== undefined && body.maxUsesPerUser !== null && body.maxUsesPerUser !== "") {
      const parsedPerUser = parseInt(String(body.maxUsesPerUser), 10);
      if (!isNaN(parsedPerUser) && parsedPerUser > 0) {
        maxUsesPerUser = parsedPerUser;
      }
    }

    // Validade
    const rawValidUntil = body.validUntil || body.expiresAt;
    const validUntil = rawValidUntil ? new Date(rawValidUntil) : null;

    // Status ativo
    const isActive = body.isActive !== undefined ? Boolean(body.isActive) : body.active !== undefined ? Boolean(body.active) : true;

    // Verifica se já existe cupom com esse código
    const existing = await prisma.coupon.findUnique({
      where: { code: cleanCode },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Já existe um cupom cadastrado com o código ${cleanCode}.` },
        { status: 409 }
      );
    }

    const created = await prisma.coupon.create({
      data: {
        code: cleanCode,
        discountType,
        discountValue: parsedValue,
        minOrderCents,
        maxUses,
        maxUsesPerUser,
        validUntil,
        isActive,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: auth.session!.user.id,
        actorType: ActorType.ADMIN,
        action: "COUPON_CREATED",
        entityType: "Coupon",
        entityId: created.id,
        metadata: {
          code: cleanCode,
          discountType,
          discountValue: parsedValue,
          minOrderCents,
          maxUses,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Cupom ${created.code} criado com sucesso!`,
      coupon: {
        ...created,
        active: created.isActive,
        minOrderAmountCents: created.minOrderCents,
        discountPercent: created.discountType === "PERCENTAGE" ? created.discountValue : null,
        discountAmountCents: created.discountType === "FIXED" ? created.discountValue : null,
      },
    });
  } catch (error: any) {
    console.error("[ADMIN_COUPON_POST_ERROR]", error);
    return NextResponse.json({ error: "Erro ao cadastrar cupom no banco de dados." }, { status: 500 });
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

    await prisma.auditLog.create({
      data: {
        userId: auth.session!.user.id,
        actorType: ActorType.ADMIN,
        action: "COUPON_DELETED",
        entityType: "Coupon",
        entityId: id,
        metadata: { code: deleted.code },
      },
    });

    return NextResponse.json({ success: true, message: `Cupom ${deleted.code} excluído com sucesso.` });
  } catch (error: any) {
    console.error("[ADMIN_COUPON_DELETE_ERROR]", error);
    return NextResponse.json({ error: "Erro ao excluir cupom." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdminSession();
  if (!auth.authorized) return auth.response!;

  try {
    const body = await req.json();
    const id = body.id;
    const rawActive = body.isActive !== undefined ? body.isActive : body.active;

    if (!id || rawActive === undefined) {
      return NextResponse.json({ error: "ID e status ativo são obrigatórios." }, { status: 400 });
    }

    const updated = await prisma.coupon.update({
      where: { id },
      data: { isActive: Boolean(rawActive) },
    });

    await prisma.auditLog.create({
      data: {
        userId: auth.session!.user.id,
        actorType: ActorType.ADMIN,
        action: "COUPON_TOGGLED",
        entityType: "Coupon",
        entityId: id,
        metadata: { code: updated.code, isActive: updated.isActive },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Cupom ${updated.code} ${updated.isActive ? "ativado" : "desativado"} com sucesso.`,
      coupon: {
        ...updated,
        active: updated.isActive,
        minOrderAmountCents: updated.minOrderCents,
        discountPercent: updated.discountType === "PERCENTAGE" ? updated.discountValue : null,
        discountAmountCents: updated.discountType === "FIXED" ? updated.discountValue : null,
      },
    });
  } catch (error: any) {
    console.error("[ADMIN_COUPON_PATCH_ERROR]", error);
    return NextResponse.json({ error: "Erro ao alternar status do cupom." }, { status: 500 });
  }
}

// PUT /api/admin/coupons - Edita dados completos de um cupom existente
export async function PUT(req: NextRequest) {
  const auth = await requireAdminSession();
  if (!auth.authorized) return auth.response!;

  try {
    const body = await req.json();
    const id = body.id;

    if (!id) {
      return NextResponse.json({ error: "ID do cupom é obrigatório para edição." }, { status: 400 });
    }

    const existing = await prisma.coupon.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Cupom não encontrado." }, { status: 404 });
    }

    const rawCode = body.code || existing.code;
    const cleanCode = String(rawCode).trim().toUpperCase();

    // Se o código mudou, checa se já existe outro com esse código
    if (cleanCode !== existing.code) {
      const duplicate = await prisma.coupon.findUnique({
        where: { code: cleanCode },
      });
      if (duplicate && duplicate.id !== id) {
        return NextResponse.json({ error: `Já existe outro cupom com o código ${cleanCode}.` }, { status: 400 });
      }
    }

    let discountType: DiscountType = existing.discountType;
    if (body.discountType) {
      discountType = String(body.discountType).toUpperCase() === "FIXED" ? DiscountType.FIXED : DiscountType.PERCENTAGE;
    }

    let parsedValue = existing.discountValue;
    if (body.discountValue !== undefined && body.discountValue !== null && body.discountValue !== "") {
      parsedValue = Math.round(Number(body.discountValue));
    } else if (body.discountPercent !== undefined && body.discountPercent !== null) {
      parsedValue = Math.round(Number(body.discountPercent));
    } else if (body.discountAmountCents !== undefined && body.discountAmountCents !== null) {
      parsedValue = Math.round(Number(body.discountAmountCents));
    }

    if (!parsedValue || parsedValue <= 0 || isNaN(parsedValue)) {
      return NextResponse.json({ error: "Valor do desconto deve ser um número maior que zero." }, { status: 400 });
    }

    if (discountType === DiscountType.PERCENTAGE && parsedValue > 100) {
      return NextResponse.json({ error: "Desconto percentual não pode ser maior que 100%." }, { status: 400 });
    }

    let minOrderCents = existing.minOrderCents || 0;
    const rawMin = body.minOrderCents ?? body.minOrderValueCents ?? body.minOrderAmountCents;
    if (rawMin !== undefined && rawMin !== null && rawMin !== "") {
      minOrderCents = Math.max(0, Math.round(Number(rawMin)) || 0);
    }

    let maxUses: number | null = existing.maxUses;
    if (body.maxUses !== undefined) {
      if (body.maxUses === null || body.maxUses === "" || Number(body.maxUses) === 0) {
        maxUses = null;
      } else {
        const parsedMax = parseInt(String(body.maxUses), 10);
        if (!isNaN(parsedMax) && parsedMax > 0) {
          maxUses = parsedMax;
        }
      }
    }

    const isActive = body.isActive !== undefined ? Boolean(body.isActive) : body.active !== undefined ? Boolean(body.active) : existing.isActive;

    const updated = await prisma.coupon.update({
      where: { id },
      data: {
        code: cleanCode,
        discountType,
        discountValue: parsedValue,
        minOrderCents,
        maxUses,
        isActive,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: auth.session!.user.id,
        actorType: ActorType.ADMIN,
        action: "COUPON_UPDATED",
        entityType: "Coupon",
        entityId: id,
        metadata: { code: updated.code, discountValue: updated.discountValue, isActive: updated.isActive },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Cupom ${updated.code} atualizado com sucesso!`,
      coupon: {
        ...updated,
        active: updated.isActive,
        minOrderAmountCents: updated.minOrderCents,
        discountPercent: updated.discountType === "PERCENTAGE" ? updated.discountValue : null,
        discountAmountCents: updated.discountType === "FIXED" ? updated.discountValue : null,
      },
    });
  } catch (error: any) {
    console.error("[ADMIN_COUPON_PUT_ERROR]", error);
    return NextResponse.json({ error: "Erro ao atualizar cupom." }, { status: 500 });
  }
}

