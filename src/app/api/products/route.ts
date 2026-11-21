import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { releaseExpiredReservations } from "@/lib/reservation";
import { ProductStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

// GET /api/products - Catálogo público de softwares
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const featuredParam = searchParams.get("featuredOnly") || searchParams.get("featured");
  const featuredOnly = featuredParam === "true";
  const category = searchParams.get("category");
  const search = searchParams.get("search");

  try {
    // 1. Libera reservas expiradas antes de calcular estoque
    await releaseExpiredReservations();

    const where: any = {
      status: { not: ProductStatus.DISABLED },
    };

    if (featuredOnly) {
      where.isFeatured = true;
    }

    if (category && category !== "all") {
      where.category = { equals: category, mode: "insensitive" };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { shortDescription: { contains: search, mode: "insensitive" } },
        { category: { contains: search, mode: "insensitive" } },
      ];
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: [
        { orderPriority: "desc" },
        { createdAt: "desc" },
      ],
      include: {
        variants: {
          where: { isActive: true },
          orderBy: { orderPriority: "asc" },
          include: {
            _count: {
              select: {
                licenseKeys: { where: { status: "UNASSIGNED" } },
              },
            },
          },
        },
        _count: {
          select: {
            licenseKeys: { where: { status: "UNASSIGNED" } },
          },
        },
      },
    });

    const formatted = products.map((prod) => {
      const totalStock = prod._count.licenseKeys;
      const minPriceCents = prod.variants.length > 0 
        ? Math.min(...prod.variants.map((v) => v.priceCents)) 
        : 0;

      const specificVariantKeysSum = prod.variants.reduce((acc, v) => acc + v._count.licenseKeys, 0);
      const unassignedGlobalKeys = Math.max(0, totalStock - specificVariantKeysSum);

      return {
        id: prod.id,
        slug: prod.slug,
        name: prod.name,
        category: prod.category,
        tagline: prod.shortDescription,
        fullDescription: prod.fullDescription,
        status: prod.status,
        videoUrl: prod.videoUrl,
        images: prod.images,
        specifications: prod.specifications,
        features: prod.features,
        currentVersion: prod.currentVersion || "v1.0.0",
        isFeatured: prod.isFeatured,
        stockCount: totalStock,
        minPriceCents,
        variants: prod.variants.map((v) => ({
          id: v.id,
          name: v.name,
          durationValue: v.durationValue,
          durationType: v.durationType,
          priceCents: v.priceCents,
          compareAtPriceCents: v.compareAtPriceCents,
          stockCount: v._count.licenseKeys > 0 ? v._count.licenseKeys : unassignedGlobalKeys,
        })),
      };
    });

    return NextResponse.json({ success: true, products: formatted });
  } catch (error: any) {
    console.error("[PUBLIC_GET_PRODUCTS_ERROR]", error);
    return NextResponse.json({ error: "Erro ao buscar produtos." }, { status: 500 });
  }
}
