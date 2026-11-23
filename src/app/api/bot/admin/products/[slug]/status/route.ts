import { NextRequest, NextResponse } from "next/server";
import { requireBotAuth } from "@/lib/bot-auth";
import { prisma } from "@/lib/prisma";
import { ProductStatus, ActorType } from "@prisma/client";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const auth = requireBotAuth(req);
  if (!auth.authorized) return auth.response!;

  const { slug } = await params;
  if (!slug) {
    return NextResponse.json({ error: "Slug do produto é obrigatório." }, { status: 400 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { status, actorDiscordId } = body;

    if (!status || !Object.values(ProductStatus).includes(status as ProductStatus)) {
      return NextResponse.json(
        {
          error: `Status inválido. Valores aceitos: ${Object.values(ProductStatus).join(", ")}`,
        },
        { status: 400 }
      );
    }

    const cleanSlug = slug.toLowerCase().trim();
    const product = await prisma.product.findUnique({
      where: { slug: cleanSlug },
    });

    if (!product) {
      return NextResponse.json(
        { error: `Produto com slug '${cleanSlug}' não foi encontrado.` },
        { status: 404 }
      );
    }

    const previousStatus = product.status;

    const updated = await prisma.product.update({
      where: { id: product.id },
      data: { status: status as ProductStatus },
    });

    // Registra alteração no log de auditoria
    await prisma.auditLog.create({
      data: {
        actorType: ActorType.BOT,
        action: "PRODUCT_STATUS_UPDATED",
        entityType: "Product",
        entityId: product.id,
        metadata: {
          productSlug: updated.slug,
          productName: updated.name,
          previousStatus,
          newStatus: updated.status,
          actorDiscordId: actorDiscordId || "DISCORD_BOT",
        },
      },
    });

    return NextResponse.json({
      success: true,
      slug: updated.slug,
      name: updated.name,
      status: updated.status,
    });
  } catch (error: any) {
    console.error("[BOT_ADMIN_UPDATE_STATUS_ERROR]", error);
    return NextResponse.json(
      { error: "Erro ao atualizar status do produto.", details: error?.message },
      { status: 500 }
    );
  }
}
