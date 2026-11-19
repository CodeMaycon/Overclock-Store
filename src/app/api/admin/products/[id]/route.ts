import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";
import { ProductStatus, DurationType } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/admin/products/[id]
export async function GET(req: NextRequest, { params }: RouteParams) {
  const auth = await requireAdminSession();
  if (!auth.authorized) return auth.response!;

  const resolved = await params;

  try {
    const product = await prisma.product.findUnique({
      where: { id: resolved.id },
      include: {
        variants: {
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
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
    }

    return NextResponse.json({ success: true, product });
  } catch (error: any) {
    return NextResponse.json({ error: "Erro ao buscar produto." }, { status: 500 });
  }
}

// PUT /api/admin/products/[id]
export async function PUT(req: NextRequest, { params }: RouteParams) {
  const auth = await requireAdminSession();
  if (!auth.authorized) return auth.response!;

  const resolved = await params;

  try {
    const body = await req.json();
    const {
      name,
      slug,
      category,
      shortDescription,
      fullDescription,
      videoUrl,
      images,
      specifications,
      features,
      currentVersion,
      changelogEntry, // { version, title, contentMarkdown }
      discordRoleId,
      status,
      isFeatured,
      variants, // array com { id?, name, durationValue, durationType, priceCents }
    } = body;

    const existingProduct = await prisma.product.findUnique({
      where: { id: resolved.id },
      include: { variants: true },
    });

    if (!existingProduct) {
      return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
    }

    const imagesArray: string[] = Array.isArray(images)
      ? images
      : typeof images === "string"
      ? images
          .split("\n")
          .map((s) => s.trim())
          .filter((s) => s.startsWith("http"))
      : existingProduct.images;

    const featuresArray: string[] = Array.isArray(features)
      ? features
      : typeof features === "string"
      ? features
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean)
      : existingProduct.features;

    const updated = await prisma.$transaction(async (tx) => {
      const prod = await tx.product.update({
        where: { id: resolved.id },
        data: {
          name: name ? name.trim() : existingProduct.name,
          slug: slug ? slug.trim().toLowerCase() : existingProduct.slug,
          category: category || existingProduct.category,
          shortDescription: shortDescription || existingProduct.shortDescription,
          fullDescription: fullDescription || existingProduct.fullDescription,
          videoUrl: videoUrl !== undefined ? (videoUrl ? videoUrl.trim() : null) : existingProduct.videoUrl,
          images: imagesArray,
          specifications: specifications !== undefined ? specifications : (existingProduct.specifications || {
            os: "Windows 10 / 11 (x64)",
            processor: "Intel & AMD",
            anticheat: "Kernel Level",
            streamProof: "100% Nativo",
          }),
          features: featuresArray,
          currentVersion: currentVersion ? currentVersion.trim() : existingProduct.currentVersion,
          discordRoleId: discordRoleId !== undefined ? (discordRoleId ? discordRoleId.trim() : null) : existingProduct.discordRoleId,
          status: status ? (status as ProductStatus) : existingProduct.status,
          isFeatured: isFeatured !== undefined ? Boolean(isFeatured) : existingProduct.isFeatured,
        },
      });

      // Cria changelog se fornecido
      if (changelogEntry && changelogEntry.title?.trim()) {
        await tx.changelog.create({
          data: {
            productId: resolved.id,
            version: changelogEntry.version?.trim() || currentVersion || existingProduct.currentVersion || "v1.0.0",
            title: changelogEntry.title.trim(),
            contentMarkdown: changelogEntry.contentMarkdown?.trim() || "Atualização de segurança aplicada.",
          },
        });
      }

      // Atualiza preços das variantes se fornecido
      if (Array.isArray(variants) && variants.length > 0) {
        for (const v of variants) {
          if (v.id) {
            await tx.productVariant.update({
              where: { id: v.id },
              data: {
                name: v.name,
                priceCents: Math.round(Number(v.priceCents)),
                compareAtPriceCents: v.compareAtPriceCents ? Math.round(Number(v.compareAtPriceCents)) : null,
              },
            });
          }
        }
      }

      return prod;
    });

    return NextResponse.json({
      success: true,
      message: "Produto atualizado com sucesso!",
      product: updated,
    });
  } catch (error: any) {
    console.error("[ADMIN_UPDATE_PRODUCT_ERROR]", error);
    return NextResponse.json({ error: "Erro ao atualizar produto." }, { status: 500 });
  }
}

// DELETE /api/admin/products/[id]
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const auth = await requireAdminSession();
  if (!auth.authorized) return auth.response!;

  const resolved = await params;

  try {
    // Para segurança e integridade referencial, se o produto tem chaves ou pedidos vinculados, apenas marcamos como DISABLED
    const keysCount = await prisma.licenseKey.count({
      where: { productId: resolved.id },
    });

    const ordersCount = await prisma.orderItem.count({
      where: { productId: resolved.id },
    });

    if (keysCount > 0 || ordersCount > 0) {
      await prisma.product.update({
        where: { id: resolved.id },
        data: { status: ProductStatus.DISABLED },
      });
      return NextResponse.json({
        success: true,
        message: "Produto desativado da loja (possui histórico de vendas/chaves vinculadas).",
      });
    }

    // Se for produto virgem sem histórico, pode deletar fisicamente
    await prisma.product.delete({
      where: { id: resolved.id },
    });

    return NextResponse.json({
      success: true,
      message: "Produto excluído definitivamente do banco de dados.",
    });
  } catch (error: any) {
    console.error("[ADMIN_DELETE_PRODUCT_ERROR]", error);
    return NextResponse.json({ error: "Erro ao excluir produto." }, { status: 500 });
  }
}
