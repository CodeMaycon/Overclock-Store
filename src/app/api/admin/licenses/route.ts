import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";
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
