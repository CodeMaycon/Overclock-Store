import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";

export async function GET() {
  const auth = await requireAdminSession();
  if (!auth.authorized) return auth.response!;

  try {
    const logs = await prisma.auditLog.findMany({
      take: 100,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { username: true, email: true, role: true },
        },
      },
    });

    const formatted = logs.map((log) => {
      const d = new Date(log.createdAt);
      return {
        id: log.id,
        action: log.action,
        actorType: log.actorType,
        entityType: log.entityType,
        entityId: log.entityId,
        user: log.user ? `@${log.user.username} (${log.user.email})` : "SISTEMA",
        metadata: log.metadata,
        dateFormatted: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }),
        timeFormatted: d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      };
    });

    return NextResponse.json({ success: true, logs: formatted });
  } catch (error: any) {
    console.error("[ADMIN_AUDIT_GET_ERROR]", error);
    return NextResponse.json({ error: "Erro ao buscar logs de auditoria." }, { status: 500 });
  }
}
