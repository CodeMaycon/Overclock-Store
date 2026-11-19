import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/status - Telemetria e integridade dos serviços
export async function GET() {
  try {
    const services = await prisma.statusService.findMany({
      orderBy: { orderPriority: "asc" },
      include: {
        incidents: {
          where: { isResolved: false },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        historyBars: {
          orderBy: { date: "desc" },
          take: 30,
        },
      },
    });

    const formatted = services.map((srv) => {
      // Gera array de 30 barras para o gráfico
      const bars = Array.from({ length: 30 }).map((_, idx) => {
        if (srv.status === "MAINTENANCE" && idx >= 28) return "DEGRADED";
        if (srv.status === "DEGRADED" && idx >= 27) return "DEGRADED";
        return "UP";
      });

      return {
        id: srv.id,
        name: srv.name,
        slug: srv.slug,
        category: "Nó do Sistema",
        status: srv.status,
        uptimePercentage: srv.uptimePercentage,
        historyBars: bars,
        currentIncident: srv.incidents[0]
          ? {
              title: srv.incidents[0].title,
              description: srv.incidents[0].description,
              status: srv.incidents[0].status,
              updatedAt: new Date(srv.incidents[0].updatedAt).toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              }),
            }
          : null,
      };
    });

    const averageUptime = services.length > 0
      ? Number((services.reduce((acc, s) => acc + s.uptimePercentage, 0) / services.length).toFixed(2))
      : 99.98;

    return NextResponse.json({
      success: true,
      overallUptime: averageUptime,
      services: formatted,
    });
  } catch (error: any) {
    console.error("[PUBLIC_GET_STATUS_ERROR]", error);
    return NextResponse.json({ error: "Erro ao obter telemetria de status." }, { status: 500 });
  }
}
