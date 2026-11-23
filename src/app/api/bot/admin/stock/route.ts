import { NextRequest, NextResponse } from "next/server";
import { requireBotAuth } from "@/lib/bot-auth";
import { prisma } from "@/lib/prisma";
import { KeyStatus, ActorType } from "@prisma/client";

export async function POST(req: NextRequest) {
  const auth = requireBotAuth(req);
  if (!auth.authorized) return auth.response!;

  try {
    const body = await req.json().catch(() => ({}));
    const { variantId, keys, actorDiscordId } = body;

    if (!variantId || !keys || !Array.isArray(keys)) {
      return NextResponse.json(
        { error: "variantId e lista de keys (array de strings) são obrigatórios." },
        { status: 400 }
      );
    }

    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      include: { product: true },
    });

    if (!variant) {
      return NextResponse.json(
        { error: "Variante de produto não encontrada." },
        { status: 404 }
      );
    }

    // Processa, faz trim e filtra strings vazias
    const sanitizedKeys = keys
      .map((k: any) => String(k).trim())
      .filter((k: string) => k.length >= 4);

    if (sanitizedKeys.length === 0) {
      return NextResponse.json(
        { error: "Nenhuma chave válida foi identificada no payload." },
        { status: 400 }
      );
    }

    // Deduplica chaves repetidas dentro do próprio payload
    const uniquePayloadKeys = Array.from(new Set(sanitizedKeys));

    // Busca chaves já existentes no banco para não estourar P2002 (Unique constraint)
    const existingInDb = await prisma.licenseKey.findMany({
      where: {
        key: { in: uniquePayloadKeys },
      },
      select: { key: true },
    });

    const existingSet = new Set(existingInDb.map((k) => k.key));
    const newKeysToInsert = uniquePayloadKeys.filter((k) => !existingSet.has(k));
    const skippedCount = keys.length - newKeysToInsert.length;

    if (newKeysToInsert.length > 0) {
      const batchId = `BATCH-BOT-${Date.now()}`;
      const insertData = newKeysToInsert.map((k) => ({
        key: k,
        productId: variant.productId,
        variantId: variant.id,
        status: KeyStatus.UNASSIGNED,
        createdBatchId: batchId,
      }));

      await prisma.licenseKey.createMany({
        data: insertData,
        skipDuplicates: true,
      });
    }

    // Contagem real do estoque atual da variante
    const currentStock = await prisma.licenseKey.count({
      where: {
        variantId: variant.id,
        status: KeyStatus.UNASSIGNED,
      },
    });

    // Registra no AuditLog apenas a contagem (NUNCA as chaves brutas)
    await prisma.auditLog.create({
      data: {
        actorType: ActorType.BOT,
        action: "STOCK_REPLENISHED",
        entityType: "ProductVariant",
        entityId: variant.id,
        metadata: {
          productName: variant.product.name,
          variantName: variant.name,
          addedCount: newKeysToInsert.length,
          skippedCount,
          currentStock,
          actorDiscordId: actorDiscordId || "DISCORD_BOT",
        },
      },
    });

    return NextResponse.json({
      success: true,
      productName: variant.product.name,
      variantName: variant.name,
      addedCount: newKeysToInsert.length,
      skippedCount,
      currentStock,
    });
  } catch (error: any) {
    console.error("[BOT_ADMIN_ADD_STOCK_ERROR]", error);
    return NextResponse.json(
      { error: "Erro ao adicionar chaves ao estoque.", details: error?.message },
      { status: 500 }
    );
  }
}
