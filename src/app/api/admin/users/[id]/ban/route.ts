import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";
import { ActorType } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const auth = await requireAdminSession();
  if (!auth.authorized) return auth.response!;

  const resolved = await params;
  const body = await req.json().catch(() => ({}));
  const { reason } = body;

  try {
    const user = await prisma.user.findUnique({
      where: { id: resolved.id },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
    }

    if (user.role === "ADMIN") {
      return NextResponse.json({ error: "Não é permitido banir administradores." }, { status: 403 });
    }

    const newBannedState = !user.isBanned;
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        isBanned: newBannedState,
        banReason: newBannedState ? (reason || "Violação dos Termos de Uso e Segurança") : null,
      },
    });

    // Registra no AuditLog
    await prisma.auditLog.create({
      data: {
        userId: auth.session!.user.id,
        actorType: ActorType.ADMIN,
        action: newBannedState ? "USER_BANNED" : "USER_UNBANNED",
        entityType: "User",
        entityId: user.id,
        metadata: {
          targetUsername: user.username,
          targetEmail: user.email,
          reason: updated.banReason,
        },
      },
    });

    return NextResponse.json({
      success: true,
      user: updated,
      message: newBannedState ? `Usuário @${user.username} foi banido.` : `Usuário @${user.username} foi reativado.`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Erro ao atualizar status de banimento." }, { status: 500 });
  }
}
