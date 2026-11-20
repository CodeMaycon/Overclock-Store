import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/admin/status - Lista serviços de status do sistema
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
    }

    const services = await prisma.statusService.findMany({
      orderBy: { orderPriority: "asc" },
    });

    return NextResponse.json({ services });
  } catch (error: any) {
    console.error("Erro ao listar status services:", error);
    return NextResponse.json({ error: "Erro interno no servidor." }, { status: 500 });
  }
}

// PATCH /api/admin/status - Atualiza status de um serviço
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
    }

    const { serviceId, status } = await req.json();

    if (!serviceId || !status) {
      return NextResponse.json({ error: "ID e status são obrigatórios." }, { status: 400 });
    }

    const updated = await prisma.statusService.update({
      where: { id: serviceId },
      data: { status },
    });

    // Sincroniza status do Produto vinculado ou por slug
    const prodStatus =
      status === "MAINTENANCE"
        ? "MAINTENANCE"
        : status === "OPERATIONAL"
        ? "ONLINE"
        : "TESTING";

    if (updated.productId) {
      await prisma.product.update({
        where: { id: updated.productId },
        data: { status: prodStatus as any },
      });
    } else {
      await prisma.product.updateMany({
        where: { slug: updated.slug },
        data: { status: prodStatus as any },
      });
    }

    // Registra na auditoria
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        actorType: "ADMIN",
        action: "STATUS_UPDATE",
        entityType: "StatusService",
        entityId: updated.id,
        metadata: {
          serviceId: updated.id,
          name: updated.name,
          newStatus: status,
          productStatusApplied: prodStatus,
        },
      },
    });

    return NextResponse.json({
      success: true,
      service: updated,
      message: `Status de ${updated.name} alterado para ${status} e sincronizado com o catálogo.`,
    });
  } catch (error: any) {
    console.error("Erro ao atualizar status service:", error);
    return NextResponse.json({ error: "Erro interno no servidor." }, { status: 500 });
  }
}
