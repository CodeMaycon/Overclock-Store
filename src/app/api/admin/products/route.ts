import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";
import { releaseExpiredReservations } from "@/lib/reservation";
import { ProductStatus, DurationType, StockType } from "@prisma/client";

// GET /api/admin/products - Lista todos os produtos com estoque real
export async function GET() {
  const auth = await requireAdminSession();
  if (!auth.authorized) return auth.response!;

  try {
    await releaseExpiredReservations();
    const products = await prisma.product.findMany({
      orderBy: [
        { orderPriority: "desc" },
        { createdAt: "desc" },
      ],
      include: {
        variants: {
          orderBy: { orderPriority: "asc" },
          include: {
            _count: {
              select: {
                licenseKeys: {
                  where: { status: "UNASSIGNED" },
                },
              },
            },
          },
        },
        _count: {
          select: {
            licenseKeys: {
              where: { status: "UNASSIGNED" },
            },
          },
        },
      },
    });

    const formatted = products.map((prod) => ({
      ...prod,
      tagline: prod.shortDescription,
      description: prod.fullDescription,
      stockCount: prod._count.licenseKeys,
      variants: prod.variants.map((v) => ({
        ...v,
        stockCount: v._count.licenseKeys,
      })),
    }));

    return NextResponse.json({ success: true, products: formatted });
  } catch (error: any) {
    console.error("[ADMIN_GET_PRODUCTS_ERROR]", error);
    return NextResponse.json(
      { error: "Erro ao buscar catálogo de produtos." },
      { status: 500 }
    );
  }
}

// POST /api/admin/products - Cadastra novo produto com variantes
export async function POST(req: NextRequest) {
  const auth = await requireAdminSession();
  if (!auth.authorized) return auth.response!;

  try {
    const body = await req.json();
    const {
      name,
      slug,
      category,
      tagline,
      shortDescription,
      description,
      fullDescription,
      videoUrl,
      images,
      specifications,
      features,
      currentVersion,
      changelogEntry,
      discordRoleId,
      status,
      isFeatured,
      variants,
    } = body;

    const finalShortDesc = shortDescription || tagline || description || name;
    const finalFullDesc = fullDescription || description || tagline || finalShortDesc;

    if (!name || !slug || !finalShortDesc) {
      return NextResponse.json(
        { error: "Nome, slug e descrição são obrigatórios." },
        { status: 400 }
      );
    }

    const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");

    // Checa se o slug já existe
    const existing = await prisma.product.findUnique({
      where: { slug: cleanSlug },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Já existe um produto cadastrado com este slug." },
        { status: 409 }
      );
    }

    // Processa imagens como array
    const imagesArray: string[] = Array.isArray(images)
      ? images
      : typeof images === "string"
      ? images
          .split("\n")
          .map((s) => s.trim())
          .filter((s) => s.startsWith("http"))
      : [];

    const featuresArray: string[] = Array.isArray(features)
      ? features
      : typeof features === "string"
      ? features
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean)
      : [
          "Injeção segura Ring-0",
          "Proteção contra memory scans",
          "Autoatendimento de HWID",
          "Suporte Especializado 24/7 no Discord"
        ];

    // Criação do produto com variantes atreladas em transação
    const createdProduct = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          name: name.trim(),
          slug: cleanSlug,
          category: category || "FPS Tático",
          shortDescription: finalShortDesc.trim(),
          fullDescription: finalFullDesc.trim(),
          videoUrl: videoUrl ? videoUrl.trim() : null,
          images: imagesArray.length > 0 ? imagesArray : [
            "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1200&auto=format&fit=crop"
          ],
          specifications: specifications || {
            os: "Windows 10 / 11 (x64)",
            processor: "Intel & AMD",
            anticheat: "Kernel Shield",
            streamProof: "100% Nativo",
          },
          features: featuresArray,
          currentVersion: currentVersion ? currentVersion.trim() : "v1.0.0",
          discordRoleId: discordRoleId ? discordRoleId.trim() : null,
          status: (status as ProductStatus) || ProductStatus.ONLINE,
          isFeatured: isFeatured !== undefined ? Boolean(isFeatured) : true,
          orderPriority: 10,
        },
      });

      if (changelogEntry && changelogEntry.title?.trim()) {
        await tx.changelog.create({
          data: {
            productId: product.id,
            version: changelogEntry.version?.trim() || currentVersion?.trim() || "v1.0.0",
            title: changelogEntry.title.trim(),
            contentMarkdown: changelogEntry.contentMarkdown?.trim() || "Versão inicial lançada.",
          },
        });
      }

      // Variantes padrão se não enviadas
      const defaultVariants = [
        { name: "Passe Diário (24h)", durationValue: 24, durationType: DurationType.HOURS, priceCents: 2490 },
        { name: "Passe Semanal (7 Dias)", durationValue: 7, durationType: DurationType.DAYS, priceCents: 7990 },
        { name: "Passe Mensal (30 Dias)", durationValue: 30, durationType: DurationType.DAYS, priceCents: 16990 },
        { name: "Licença Vitalícia (Lifetime)", durationValue: 0, durationType: DurationType.LIFETIME, priceCents: 49990 },
      ];

      const variantsToCreate = Array.isArray(variants) && variants.length > 0 ? variants : defaultVariants;

      for (let i = 0; i < variantsToCreate.length; i++) {
        const v = variantsToCreate[i];
        const dVal = v.durationValue !== undefined 
          ? Number(v.durationValue) 
          : (v.durationHours !== undefined ? Number(v.durationHours) : 24);

        let dType = v.durationType as DurationType;
        if (!dType) {
          if (v.isLifetime || dVal >= 800000 || dVal === 0) {
            dType = DurationType.LIFETIME;
          } else if (dVal % 24 === 0 && dVal > 24) {
            dType = DurationType.DAYS;
          } else {
            dType = DurationType.HOURS;
          }
        }

        await tx.productVariant.create({
          data: {
            productId: product.id,
            name: v.name,
            durationValue: dVal,
            durationType: dType,
            priceCents: Math.round(Number(v.priceCents)),
            compareAtPriceCents: v.compareAtPriceCents ? Math.round(Number(v.compareAtPriceCents)) : null,
            stockType: StockType.BATCH,
            orderPriority: i + 1,
          },
        });
      }

      return product;
    });

    return NextResponse.json({
      success: true,
      message: "Produto criado com sucesso!",
      product: createdProduct,
    }, { status: 201 });
  } catch (error: any) {
    console.error("[ADMIN_CREATE_PRODUCT_ERROR]", error);
    return NextResponse.json(
      { error: "Erro ao criar produto no banco de dados." },
      { status: 500 }
    );
  }
}
