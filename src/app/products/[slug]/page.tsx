import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { releaseExpiredReservations } from "@/lib/reservation";
import ProductDetailClient from "./ProductDetailClient";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { slug } = await params;

  // 1. Libera reservas expiradas antes de carregar produto e estoque
  await releaseExpiredReservations();

  let prod = await prisma.product.findUnique({
    where: { slug },
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

  // Fallback para aliases antigos se alguém acessar URLs legadas
  if (!prod) {
    if (slug === "phantom-apex") {
      prod = await prisma.product.findUnique({
        where: { slug: "apex-phantom-pro" },
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
    } else if (slug === "vortex-warzone") {
      prod = await prisma.product.findUnique({
        where: { slug: "warzone-ghost-ring0" },
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
    } else if (slug === "spectre-val") {
      prod = await prisma.product.findUnique({
        where: { slug: "valorant-discreet-engine" },
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
    }
  }

  if (!prod) {
    notFound();
  }

  const formattedProduct = {
    id: prod.id,
    slug: prod.slug,
    name: prod.name,
    category: prod.category,
    tagline: prod.shortDescription,
    fullDescription: prod.fullDescription,
    status: prod.status,
    videoUrl: prod.videoUrl,
    images: prod.images,
    specifications: (prod.specifications as any) || {
      os: "Windows 10 / 11 (21H2 - 24H2)",
      processor: "Intel & AMD (Todas as gerações)",
      anticheat: "Kernel Level",
      streamProof: "100% Nativo (OBS, Discord, GeForce)",
    },
    features: prod.features,
    currentVersion: prod.currentVersion || "v1.0.0",
    isFeatured: prod.isFeatured,
    stockCount: prod._count.licenseKeys,
    variants: (() => {
      const totalStock = prod._count.licenseKeys;
      const specificVariantKeysSum = prod.variants.reduce((acc, v) => acc + v._count.licenseKeys, 0);
      const unassignedGlobalKeys = Math.max(0, totalStock - specificVariantKeysSum);

      return prod.variants.map((v) => ({
        id: v.id,
        name: v.name,
        durationValue: v.durationValue,
        durationType: v.durationType,
        priceCents: v.priceCents,
        compareAtPriceCents: v.compareAtPriceCents,
        stockCount: v._count.licenseKeys > 0 ? v._count.licenseKeys : unassignedGlobalKeys,
      }));
    })(),
    changelogs: prod.changelogs.map((c) => ({
      id: c.id,
      productSlug: prod.slug,
      productName: prod.name,
      version: c.version,
      title: c.title,
      date: c.releaseDate ? c.releaseDate.toISOString().split("T")[0] : "Recente",
      type: "FEATURE",
      changes: [c.contentMarkdown],
    })),
  };

  return <ProductDetailClient product={formattedProduct} />;
}
