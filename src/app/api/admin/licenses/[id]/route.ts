import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";
import { KeyStatus } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH /api/admin/licenses/[id] - Revoga chave ou desvincula e devolve ao estoque
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const auth = await requireAdminSession();
  if (!auth.authorized) return auth.response!;

  const { id } = await params;

  try {
    const body = await req.json().catch(() => ({}));
    const { action, reason } = body;

    if (!action || !["RETURN_TO_STOCK", "REVOKE"].includes(action)) {
      return NextResponse.json(
        { error: "Ação inválida. Utilize 'RETURN_TO_STOCK' ou 'REVOKE'." },
        { status: 400 }
      );
    }

    const key = await prisma.licenseKey.findUnique({
      where: { id },
      include: {
        product: { select: { id: true, name: true, slug: true } },
        variant: { select: { id: true, name: true } },
        user: { select: { id: true, username: true, email: true } },
      },
    });

    if (!key) {
      return NextResponse.json({ error: "Chave não encontrada." }, { status: 404 });
    }

    const adminUser = auth.session!.user;

    if (action === "RETURN_TO_STOCK") {
      const updatedNotes = [
        key.notes,
        `[${new Date().toISOString()}] Desvinculada de @${key.user?.username || key.userId || "desconhecido"} e devolvida ao estoque por ${adminUser.email}. Motivo: ${reason || "Devolução manual"}`,
      ]
        .filter(Boolean)
        .join(" | ");

      const updated = await prisma.licenseKey.update({
        where: { id },
        data: {
          userId: null,
          orderId: null,
          status: KeyStatus.UNASSIGNED,
          hwid: null,
          activatedAt: null,
          expiresAt: null,
          freezeStartedAt: null,
          totalFrozenSeconds: 0,
          notes: updatedNotes,
        },
      });

      // Registra evento na tabela de Auditoria
      await prisma.auditLog.create({
        data: {
          userId: adminUser.id,
          actorType: "ADMIN",
          action: "LICENSE_UNLINKED_TO_STOCK",
          entityType: "LicenseKey",
          entityId: key.id,
          metadata: {
            key: key.key,
            product: key.product?.name,
            variant: key.variant?.name,
            previousUserId: key.userId,
            previousUserEmail: key.user?.email,
            previousUsername: key.user?.username,
            previousStatus: key.status,
            reason: reason || "Chave desvinculada do cliente e retornada ao estoque disponível",
          },
        },
      });

      return NextResponse.json({
        success: true,
        message: "Chave desvinculada com sucesso e retornada ao estoque disponível!",
        key: updated,
      });
    }

    if (action === "REVOKE") {
      const updatedNotes = [
        key.notes,
        `[${new Date().toISOString()}] Revogada por ${adminUser.email}. Motivo: ${reason || "Revogação administrativa"}`,
      ]
        .filter(Boolean)
        .join(" | ");

      const updated = await prisma.licenseKey.update({
        where: { id },
        data: {
          status: KeyStatus.REVOKED,
          notes: updatedNotes,
        },
      });

      // Registra evento na tabela de Auditoria
      await prisma.auditLog.create({
        data: {
          userId: adminUser.id,
          actorType: "ADMIN",
          action: "LICENSE_REVOKED",
          entityType: "LicenseKey",
          entityId: key.id,
          metadata: {
            key: key.key,
            product: key.product?.name,
            variant: key.variant?.name,
            userId: key.userId,
            userEmail: key.user?.email,
            username: key.user?.username,
            previousStatus: key.status,
            reason: reason || "Chave revogada pelo administrador",
          },
        },
      });

      return NextResponse.json({
        success: true,
        message: "Chave revogada com sucesso!",
        key: updated,
      });
    }
  } catch (error: any) {
    console.error("[ADMIN_PATCH_LICENSE_ERROR]", error);
    return NextResponse.json(
      { error: "Erro ao processar alteração da chave de licença." },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/licenses/[id] - Exclusão direta da chave
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const auth = await requireAdminSession();
  if (!auth.authorized) return auth.response!;

  const { id } = await params;

  try {
    const key = await prisma.licenseKey.findUnique({
      where: { id },
      include: {
        product: { select: { name: true } },
        variant: { select: { name: true } },
        user: { select: { username: true, email: true } },
      },
    });

    if (!key) {
      return NextResponse.json({ error: "Chave não encontrada." }, { status: 404 });
    }

    await prisma.licenseKey.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId: auth.session!.user.id,
        actorType: "ADMIN",
        action: "LICENSE_DELETED",
        entityType: "LicenseKey",
        entityId: id,
        metadata: {
          key: key.key,
          product: key.product?.name,
          variant: key.variant?.name,
          userId: key.user?.email,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Chave excluída do sistema com sucesso!",
    });
  } catch (error: any) {
    console.error("[ADMIN_DELETE_LICENSE_ERROR]", error);
    return NextResponse.json(
      { error: "Erro ao excluir chave de licença." },
      { status: 500 }
    );
  }
}
