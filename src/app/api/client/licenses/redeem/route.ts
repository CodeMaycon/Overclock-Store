import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { KeyStatus, ActorType } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const body = await req.json();
    const { key } = body;

    if (!key || typeof key !== "string") {
      return NextResponse.json(
        { error: "Código da chave de licença é obrigatório." },
        { status: 400 }
      );
    }

    const cleanKey = key.trim().toUpperCase();

    // Busca a chave no banco que esteja disponível (UNASSIGNED)
    const license = await prisma.licenseKey.findUnique({
      where: { key: cleanKey },
      include: {
        product: { select: { name: true } },
        variant: { select: { name: true } },
      },
    });

    if (!license) {
      return NextResponse.json(
        { error: "Chave não encontrada ou inexistente no sistema." },
        { status: 404 }
      );
    }

    if (license.status !== KeyStatus.UNASSIGNED) {
      return NextResponse.json(
        { error: "Esta chave já foi resgatada, reservada ou ativada por outro usuário." },
        { status: 400 }
      );
    }

    // Vincula a chave ao usuário como NOT_ACTIVATED
    const updated = await prisma.$transaction(async (tx) => {
      const keyLinked = await tx.licenseKey.update({
        where: { id: license.id },
        data: {
          userId: session.user.id,
          status: KeyStatus.NOT_ACTIVATED,
          reservedUntil: null,
          notes: `Resgatada via painel do cliente pelo usuário ${session.user.name || session.user.email}`,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          actorType: ActorType.USER,
          action: "LICENSE_REDEEMED",
          entityType: "LicenseKey",
          entityId: license.id,
          metadata: {
            productName: license.product.name,
            variantName: license.variant.name,
          },
        },
      });

      return keyLinked;
    });

    return NextResponse.json({
      success: true,
      message: `Chave de ${license.product.name} (${license.variant.name}) vinculada com sucesso à sua conta!`,
      license: {
        id: updated.id,
        key: updated.key,
        status: updated.status,
      },
    });
  } catch (error: any) {
    console.error("[REDEEM_LICENSE_ERROR]", error);
    return NextResponse.json(
      { error: "Erro interno ao resgatar chave de licença." },
      { status: 500 }
    );
  }
}
