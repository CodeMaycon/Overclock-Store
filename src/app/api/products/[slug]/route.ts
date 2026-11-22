import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

// GET /api/products/[slug] - Detalhes do produto com variantes e estoque
export async function GET(req: NextRequest, { params }: RouteParams) {
  const resolved = await params;

  try {
    let rawSlug = resolved.slug;
    let decodedSlug = rawSlug;
    try {
      decodedSlug = decodeURIComponent(rawSlug);
    } catch (_) {}

    const cleanSlug = slugify(decodedSlug);

    const prod = await prisma.product.findFirst({
      where: {
        OR: [
          { slug: cleanSlug },
          { slug: decodedSlug },
          { slug: rawSlug },
        ],
      },
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
        changelogs: {
          orderBy: { releaseDate: "desc" },
          take: 5,
        },
        _count: {
          select: {
            licenseKeys: { where: { status: "UNASSIGNED" } },
          },
        },
      },
    });

    if (!prod) {
      return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
    }

    const formatted = {
      id: prod.id,
      slug: prod.slug,
      name: prod.name,
      category: prod.category,
      tagline: prod.shortDescription,
      fullDescription: prod.fullDescription,
      status: prod.status,
      videoUrl: prod.videoUrl,
      images: prod.images,
      specifications: prod.specifications || {
        os: "Windows 10 / 11 (x64)",
        processor: "Intel & AMD",
        anticheat: "Kernel Level",
        streamProof: "100% Nativo",
      },
      features: prod.features,
      currentVersion: prod.currentVersion || "v1.0.0",
      isFeatured: prod.isFeatured,
      stockCount: prod._count.licenseKeys,
      variants: prod.variants.map((v) => ({
        id: v.id,
        name: v.name,
        durationValue: v.durationValue,
        durationType: v.durationType,
        priceCents: v.priceCents,
        compareAtPriceCents: v.compareAtPriceCents,
        stockCount: v._count.licenseKeys,
      })),
      changelogs: prod.changelogs,
    };

    return NextResponse.json({ success: true, product: formatted });
  } catch (error: any) {
    console.error("[PUBLIC_GET_PRODUCT_BY_SLUG_ERROR]", error);
    return NextResponse.json({ error: "Erro ao buscar produto." }, { status: 500 });
  }
}
