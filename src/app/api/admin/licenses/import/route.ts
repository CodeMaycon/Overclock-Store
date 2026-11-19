import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";
import { KeyStatus } from "@prisma/client";

// POST /api/admin/licenses/import - Importa lote de chaves para o estoque
export async function POST(req: NextRequest) {
  const auth = await requireAdminSession();
  if (!auth.authorized) return auth.response!;

  try {
    const body = await req.json();
    const { productId, variantId, rawKeys } = body;

    if (!productId || !variantId || !rawKeys) {
      return NextResponse.json(
        { error: "Produto, variante e lista de chaves são obrigatórios." },
        { status: 400 }
      );
    }

    // Processa o texto de chaves (uma por linha)
    const keyLines = (typeof rawKeys === "string" ? rawKeys.split("\n") : rawKeys)
      .map((k: string) => k.trim())
      .filter((k: string) => k.length >= 6);

    if (keyLines.length === 0) {
      return NextResponse.json(
        { error: "Nenhuma chave válida foi identificada no texto informado." },
        { status: 400 }
      );
    }

    // Busca chaves já existentes para evitar duplicação
    const existingKeys = await prisma.licenseKey.findMany({
      where: { key: { in: keyLines } },
      select: { key: true },
    });

    const existingSet = new Set(existingKeys.map((k) => k.key));
    const newUniqueKeys = Array.from(new Set(keyLines)).filter((k) => !existingSet.has(k as string));

    if (newUniqueKeys.length === 0) {
      return NextResponse.json(
        { error: "Todas as chaves informadas já constam no banco de dados." },
        { status: 409 }
      );
    }

    // Insere chaves em lote
    const batchId = `BATCH-${Date.now()}`;
    const insertData = newUniqueKeys.map((k) => ({
      key: k as string,
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
      message: `${newUniqueKeys.length} chaves importadas com sucesso para o estoque!`,
      importedCount: newUniqueKeys.length,
      skippedCount: keyLines.length - newUniqueKeys.length,
      batchId,
    });
  } catch (error: any) {
    console.error("[ADMIN_IMPORT_KEYS_ERROR]", error);
    return NextResponse.json(
      { error: "Erro ao importar lote de chaves no banco de dados." },
      { status: 500 }
    );
  }
}
