import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { HWIDRequestStatus, ActorType } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const resolved = await params;
    const licenseId = resolved.id;

    const body = await req.json().catch(() => ({}));
    const reason = body?.reason || "Troca de componentes de hardware ou formatação de sistema.";

    const license = await prisma.licenseKey.findUnique({
      where: { id: licenseId },
      include: { product: true },
    });

    if (!license || license.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Licença não encontrada ou não pertence à sua conta." },
        { status: 404 }
      );
    }

    // Valida Cooldown de 7 dias
    const COOLDOWN_DAYS = 7;
    const COOLDOWN_MS = COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
    const now = new Date();

    if (license.lastHwidResetAt) {
      const timeSinceLastReset = now.getTime() - license.lastHwidResetAt.getTime();
      if (timeSinceLastReset < COOLDOWN_MS) {
        const remainingMs = COOLDOWN_MS - timeSinceLastReset;
        const daysRemaining = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
        const hoursRemaining = Math.floor((remainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

        return NextResponse.json(
          {
            error: `Limite de segurança: O reset de HWID possui um intervalo de 7 dias. Aguarde ${daysRemaining} dia(s) e ${hoursRemaining} hora(s) para solicitar novamente.`,
            cooldownActive: true,
            daysRemaining,
            hoursRemaining,
          },
          { status: 429 }
        );
      }
    }

    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0] : req.headers.get("x-real-ip") || "127.0.0.1";

    // Executa reset de HWID
    await prisma.$transaction(async (tx) => {
      // 1. Cria solicitação no histórico
      await tx.hWIDResetRequest.create({
        data: {
          licenseKeyId: license.id,
          userId: session.user.id,
          currentHwid: license.hwid,
          reason,
          status: HWIDRequestStatus.APPROVED,
          ipAddress: ip,
          reviewedAt: now,
        },
      });

      // 2. Limpa HWID e grava timestamp de cooldown
      await tx.licenseKey.update({
        where: { id: license.id },
        data: {
          hwid: null,
          lastHwidResetAt: now,
        },
      });

      // 3. Auditoria
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          actorType: ActorType.USER,
          action: "HWID_RESET_AUTO_APPROVED",
          entityType: "LicenseKey",
          entityId: license.id,
          ipAddress: ip,
          metadata: {
            reason,
            productName: license.product.name,
          },
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "HWID desvinculado com sucesso! Você já pode inicializar o software no seu novo computador.",
      lastHwidResetAt: now,
    });
  } catch (error: any) {
    console.error("[RESET_HWID_ERROR]", error);
    return NextResponse.json(
      { error: "Erro ao processar reset de hardware." },
      { status: 500 }
    );
  }
}
