import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { ActorType } from "@prisma/client";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminSession();
    if (!auth.authorized) return auth.response!;

    const { id } = await params;
    const body = await req.json();
    const { isApproved } = body;

    if (typeof isApproved !== "boolean") {
      return NextResponse.json(
        { error: "Campo isApproved (boolean) é obrigatório." },
        { status: 400 }
      );
    }

    const existing = await prisma.review.findUnique({
      where: { id },
      include: {
        product: { select: { name: true } },
        user: { select: { email: true } },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Avaliação não encontrada." },
        { status: 404 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const rev = await tx.review.update({
        where: { id },
        data: { isApproved },
      });

      await tx.auditLog.create({
        data: {
          userId: auth.session?.user.id,
          actorType: ActorType.ADMIN,
          action: isApproved ? "REVIEW_APPROVED" : "REVIEW_HIDDEN",
          entityType: "Review",
          entityId: id,
          metadata: {
            rating: existing.rating,
            productName: existing.product.name,
            authorEmail: existing.user.email,
            previousApprovedState: existing.isApproved,
            newApprovedState: isApproved,
          },
        },
      });

      return rev;
    });

    return NextResponse.json({
      success: true,
      message: isApproved ? "Avaliação aprovada e publicada com sucesso." : "Avaliação ocultada do público.",
      review: updated,
    });
  } catch (error: any) {
    console.error("[PATCH_ADMIN_REVIEW_ERROR]", error);
    return NextResponse.json(
      { error: "Erro ao atualizar status da avaliação." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminSession();
    if (!auth.authorized) return auth.response!;

    const { id } = await params;

    const existing = await prisma.review.findUnique({
      where: { id },
      include: {
        product: { select: { name: true } },
        user: { select: { email: true } },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Avaliação não encontrada." },
        { status: 404 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.review.delete({
        where: { id },
      });

      await tx.auditLog.create({
        data: {
          userId: auth.session?.user.id,
          actorType: ActorType.ADMIN,
          action: "REVIEW_DELETED",
          entityType: "Review",
          entityId: id,
          metadata: {
            rating: existing.rating,
            productName: existing.product.name,
            authorEmail: existing.user.email,
          },
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Avaliação excluída com sucesso.",
    });
  } catch (error: any) {
    console.error("[DELETE_ADMIN_REVIEW_ERROR]", error);
    return NextResponse.json(
      { error: "Erro ao excluir avaliação." },
      { status: 500 }
    );
  }
}
