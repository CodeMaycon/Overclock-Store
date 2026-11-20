import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/status - Status real dos produtos e serviços
export async function GET() {
  try {
    const [services, products] = await Promise.all([
      prisma.statusService.findMany({
        orderBy: { orderPriority: "asc" },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              category: true,
              status: true,
              currentVersion: true,
              updatedAt: true,
            },
          },
          incidents: {
            where: { isResolved: false },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      }),
      prisma.product.findMany({
        orderBy: [{ orderPriority: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          name: true,
          slug: true,
          category: true,
          status: true,
          currentVersion: true,
          updatedAt: true,
        },
      }),
    ]);

    const formattedServices = services.map((srv) => ({
      id: srv.id,
      name: srv.name,
      slug: srv.slug,
      category: srv.product?.category || "Serviço",
      status: srv.status,
      version: srv.product?.currentVersion || null,
      productSlug: srv.product?.slug || null,
      lastUpdatedAt: srv.updatedAt.toISOString(),
      currentIncident: srv.incidents[0]
        ? {
            title: srv.incidents[0].title,
            description: srv.incidents[0].description,
            status: srv.incidents[0].status,
            updatedAt: srv.incidents[0].updatedAt.toISOString(),
          }
        : null,
    }));

    const formattedProducts = products.map((prod) => ({
      id: prod.id,
      name: prod.name,
      slug: prod.slug,
      category: prod.category,
      status: prod.status,
      version: prod.currentVersion || "1.0.0",
      updatedAt: prod.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      services: formattedServices,
      products: formattedProducts,
      totalCount: formattedServices.length + formattedProducts.length,
    });
  } catch (error: any) {
    console.error("[PUBLIC_GET_STATUS_ERROR]", error);
    return NextResponse.json({ error: "Erro ao obter status dos serviços e produtos." }, { status: 500 });
  }
}
