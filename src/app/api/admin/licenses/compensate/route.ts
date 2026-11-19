import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";
import { KeyStatus } from "@prisma/client";

// POST /api/admin/licenses/compensate - Adiciona horas extras a licenças ativas
export async function POST(req: NextRequest) {
  const auth = await requireAdminSession();
  if (!auth.authorized) return auth.response!;

  try {
    const body = await req.json();
    const { productId, additionalHours = 24 } = body;

    const hours = parseInt(additionalHours, 10);
    if (isNaN(hours) || hours <= 0) {
      return NextResponse.json(
        { error: "Informe um número válido de horas para compensação." },
        { status: 400 }
      );
    }

    const where: any = {
      status: { in: [KeyStatus.ACTIVE, KeyStatus.FROZEN] },
      expiresAt: { not: null },
    };

    if (productId) {
      where.productId = productId;
    }

    const eligibleKeys = await prisma.licenseKey.findMany({
      where,
      select: { id: true, expiresAt: true },
    });

    if (eligibleKeys.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Nenhuma licença com tempo ativo foi encontrada para compensação.",
        compensatedCount: 0,
      });
    }

    const additionalMs = hours * 60 * 60 * 1000;

    for (const k of eligibleKeys) {
      if (k.expiresAt) {
        const newExpiration = new Date(new Date(k.expiresAt).getTime() + additionalMs);
        await prisma.licenseKey.update({
          where: { id: k.id },
          data: { expiresAt: newExpiration },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sucesso! +${hours}h foram adicionadas a ${eligibleKeys.length} licenças ativas.`,
      compensatedCount: eligibleKeys.length,
      hoursAdded: hours,
    });
  } catch (error: any) {
    console.error("[ADMIN_COMPENSATE_ERROR]", error);
    return NextResponse.json(
      { error: "Erro ao aplicar compensação de horas." },
      { status: 500 }
    );
  }
}
