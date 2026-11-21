import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";
import { releaseExpiredReservations } from "@/lib/reservation";
import { KeyStatus } from "@prisma/client";

// GET /api/admin/licenses - Estatísticas gerais e listagem de chaves com filtros
export async function GET(req: NextRequest) {
  const auth = await requireAdminSession();
  if (!auth.authorized) return auth.response!;

  const { searchParams } = new URL(req.url);
  const productId = searchParams.get("productId");
  const status = searchParams.get("status") as KeyStatus | null;
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "50", 10);

  try {
    await releaseExpiredReservations();
    const where: any = {};
    if (productId) where.productId = productId;
    if (status) where.status = status;

    const [totalCount, keys, statusCounts] = await Promise.all([
      prisma.licenseKey.count({ where }),
      prisma.licenseKey.findMany({
        where,
        take: limit,
        skip: (page - 1) * limit,
        orderBy: { createdAt: "desc" },
        include: {
          product: { select: { id: true, name: true, slug: true } },
          variant: { select: { id: true, name: true, priceCents: true } },
          user: { select: { id: true, username: true, email: true } },
        },
      }),
      prisma.licenseKey.groupBy({
        by: ["status"],
        _count: { _all: true },
        where: productId ? { productId } : {},
      }),
    ]);

    const metrics = {
      unassigned: statusCounts.find((s) => s.status === KeyStatus.UNASSIGNED)?._count._all || 0,
      active: statusCounts.find((s) => s.status === KeyStatus.ACTIVE)?._count._all || 0,
      frozen: statusCounts.find((s) => s.status === KeyStatus.FROZEN)?._count._all || 0,
      notActivated: statusCounts.find((s) => s.status === KeyStatus.NOT_ACTIVATED)?._count._all || 0,
      expired: statusCounts.find((s) => s.status === KeyStatus.EXPIRED)?._count._all || 0,
    };

    return NextResponse.json({
      success: true,
      metrics,
      totalCount,
      page,
      limit,
      keys,
    });
  } catch (error: any) {
    console.error("[ADMIN_GET_LICENSES_ERROR]", error);
    return NextResponse.json({ error: "Erro ao buscar licenças." }, { status: 500 });
  }
}

// DELETE /api/admin/licenses - Exclui chaves específicas ou lote de chaves não atribuídas
export async function DELETE(req: NextRequest) {
  const auth = await requireAdminSession();
  if (!auth.authorized) return auth.response!;

  try {
    const body = await req.json().catch(() => ({}));
    const { keyId, keyIds, productId, variantId, count, status = "UNASSIGNED" } = body;

    let deletedCount = 0;

    if (keyId) {
      // Exclui chave única
      const key = await prisma.licenseKey.findUnique({ where: { id: keyId } });
      if (!key) {
        return NextResponse.json({ error: "Chave não encontrada." }, { status: 404 });
      }

      await prisma.licenseKey.delete({ where: { id: keyId } });
      deletedCount = 1;
    } else if (Array.isArray(keyIds) && keyIds.length > 0) {
      // Exclui lista de chaves por ID
      const res = await prisma.licenseKey.deleteMany({
        where: { id: { in: keyIds } },
      });
      deletedCount = res.count;
    } else if (productId && count && Number(count) > 0) {
      // Exclui X chaves de um produto/variante
      const whereClause: any = {
        productId,
        status: status as KeyStatus,
      };
      if (variantId) whereClause.variantId = variantId;

      const keysToDelete = await prisma.licenseKey.findMany({
        where: whereClause,
        take: Number(count),
        select: { id: true },
      });

      if (keysToDelete.length > 0) {
        const res = await prisma.licenseKey.deleteMany({
          where: { id: { in: keysToDelete.map((k) => k.id) } },
        });
        deletedCount = res.count;
      }
    } else {
      return NextResponse.json(
        { error: "Informe o ID da chave, array de IDs ou produto + quantidade a remover." },
        { status: 400 }
      );
    }

    // Registra na Auditoria
    await prisma.auditLog.create({
      data: {
        userId: auth.session!.user.id,
        actorType: "ADMIN",
        action: "KEYS_DELETED",
        entityType: "LicenseKey",
        entityId: keyId || (keyIds ? keyIds[0] : productId),
        metadata: {
          deletedCount,
          keyId: keyId || null,
          productId: productId || null,
          variantId: variantId || null,
        },
      },
    });

    return NextResponse.json({
      success: true,
      deletedCount,
      message: `${deletedCount} chave(s) removida(s) com sucesso do estoque.`,
    });
  } catch (error: any) {
    console.error("[ADMIN_DELETE_LICENSES_ERROR]", error);
    return NextResponse.json({ error: "Erro ao remover chaves do estoque." }, { status: 500 });
  }
}
