import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";
import { KeyStatus } from "@prisma/client";
import crypto from "crypto";

// POST /api/admin/licenses/generate - Gera chaves automaticamente no padrão OVERCLOCK-XXXX
export async function POST(req: NextRequest) {
  const auth = await requireAdminSession();
  if (!auth.authorized) return auth.response!;

  try {
    const body = await req.json();
    const { productId, variantId, quantity = 10, prefix = "OVERCLOCK" } = body;

    if (!productId || !variantId) {
      return NextResponse.json(
        { error: "Produto e variante são obrigatórios." },
        { status: 400 }
      );
    }

    const qty = Math.min(Math.max(parseInt(quantity, 10) || 10, 1), 500);

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { slug: true },
    });

    if (!product) {
      return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
    }

    const prodCode = product.slug.substring(0, 4).toUpperCase();
    const batchId = `GEN-${Date.now()}`;
    const generatedKeys: string[] = [];

    for (let i = 0; i < qty; i++) {
      const seg1 = crypto.randomBytes(2).toString("hex").toUpperCase();
      const seg2 = crypto.randomBytes(2).toString("hex").toUpperCase();
      const seg3 = crypto.randomBytes(2).toString("hex").toUpperCase();
      const key = `${prefix}-${prodCode}-${seg1}-${seg2}-${seg3}`;
      generatedKeys.push(key);
    }

    const insertData = generatedKeys.map((k) => ({
      key: k,
      productId,
      variantId,
      status: KeyStatus.UNASSIGNED,
      createdBatchId: batchId,
    }));

    await prisma.licenseKey.createMany({
      data: insertData,
      skipDuplicates: true,
    });

    return NextResponse.json({
      success: true,
      message: `${qty} chaves geradas e adicionadas ao estoque com sucesso!`,
      generatedCount: qty,
      batchId,
      preview: generatedKeys.slice(0, 3),
    });
  } catch (error: any) {
    console.error("[ADMIN_GENERATE_KEYS_ERROR]", error);
    return NextResponse.json(
      { error: "Erro ao gerar chaves de licença." },
      { status: 500 }
    );
  }
}
