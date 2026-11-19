import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";
import { HWIDRequestStatus, ActorType } from "@prisma/client";

export async function GET() {
  const auth = await requireAdminSession();
  if (!auth.authorized) return auth.response!;

  try {
    const requests = await prisma.hWIDResetRequest.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        licenseKey: {
          include: {
            product: { select: { name: true, slug: true } },
          },
        },
        user: {
          select: { username: true, email: true, fullName: true, discordUsername: true },
        },
      },
    });

    return NextResponse.json({ success: true, requests });
  } catch (error: any) {
    return NextResponse.json({ error: "Erro ao buscar solicitações de HWID." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdminSession();
  if (!auth.authorized) return auth.response!;

  try {
    const body = await req.json();
    const { requestId, status } = body;

    if (!requestId || !["APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 });
    }

    const resetRequest = await prisma.hWIDResetRequest.findUnique({
      where: { id: requestId },
      include: { licenseKey: true },
    });

    if (!resetRequest) {
      return NextResponse.json({ error: "Solicitação não encontrada." }, { status: 404 });
    }

    const now = new Date();

    await prisma.$transaction(async (tx) => {
      // 1. Atualiza a solicitação
      await tx.hWIDResetRequest.update({
        where: { id: requestId },
        data: {
          status: status as HWIDRequestStatus,
          reviewedBy: auth.session!.user.username,
          reviewedAt: now,
        },
      });

      // 2. Se aprovado, limpa o HWID travado na chave
      if (status === "APPROVED") {
        await tx.licenseKey.update({
          where: { id: resetRequest.licenseKeyId },
          data: {
            hwid: null,
            lastHwidResetAt: now,
          },
        });
      }

      // 3. Auditoria
      await tx.auditLog.create({
        data: {
          userId: auth.session!.user.id,
          actorType: ActorType.ADMIN,
          action: status === "APPROVED" ? "HWID_RESET_APPROVED" : "HWID_RESET_REJECTED",
          entityType: "HWIDResetRequest",
          entityId: requestId,
          metadata: {
            licenseKeyId: resetRequest.licenseKeyId,
            previousHwid: resetRequest.currentHwid,
          },
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: status === "APPROVED" ? "Reset de HWID aprovado. Hardware desvinculado!" : "Solicitação de reset rejeitada.",
    });
  } catch (error: any) {
    console.error("[ADMIN_HWID_PATCH_ERROR]", error);
    return NextResponse.json({ error: "Erro ao atualizar solicitação de HWID." }, { status: 500 });
  }
}
