import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
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
      tagline,
      shortDescription,
      description,
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

    const finalShortDesc = shortDescription !== undefined 
      ? shortDescription 
      : tagline !== undefined 
      ? tagline 
      : existingProduct.shortDescription;

    const finalFullDesc = fullDescription !== undefined 
      ? fullDescription 
      : description !== undefined 
      ? description 
      : existingProduct.fullDescription;

    const updated = await prisma.$transaction(async (tx) => {
      const prod = await tx.product.update({
        where: { id: resolved.id },
        data: {
          name: name ? name.trim() : existingProduct.name,
          slug: slug ? slug.trim().toLowerCase() : existingProduct.slug,
          category: category || existingProduct.category,
          shortDescription: finalShortDesc,
          fullDescription: finalFullDesc,
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

    try {
      revalidatePath("/");
      revalidatePath("/products");
    } catch (_) {}

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

// PATCH /api/admin/products/[id] - Ativar / Desativar status do produto
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const auth = await requireAdminSession();
  if (!auth.authorized) return auth.response!;

  const resolved = await params;

  try {
    const body = await req.json().catch(() => ({}));
    const existing = await prisma.product.findUnique({
      where: { id: resolved.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
    }

    let newStatus: ProductStatus;
    if (body.status && Object.values(ProductStatus).includes(body.status)) {
      newStatus = body.status as ProductStatus;
    } else {
      // Toggle automático entre ONLINE e DISABLED
      newStatus = existing.status === ProductStatus.DISABLED ? ProductStatus.ONLINE : ProductStatus.DISABLED;
    }

    const updated = await prisma.product.update({
      where: { id: resolved.id },
      data: { status: newStatus },
    });

    try {
      revalidatePath("/");
      revalidatePath("/products");
    } catch (_) {}

    return NextResponse.json({
      success: true,
      message: `Status do produto alterado para ${newStatus}.`,
      status: newStatus,
      product: updated,
    });
  } catch (error: any) {
    console.error("[ADMIN_TOGGLE_PRODUCT_STATUS_ERROR]", error);
    return NextResponse.json({ error: "Erro ao alterar status do produto." }, { status: 500 });
  }
}

// DELETE /api/admin/products/[id] - Exclusão definitiva ou segura com limpeza de chaves/variantes
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const auth = await requireAdminSession();
  if (!auth.authorized) return auth.response!;

  const resolved = await params;

  try {
    const existing = await prisma.product.findUnique({
      where: { id: resolved.id },
      include: {
        _count: {
          select: {
            licenseKeys: true,
            orderItems: true,
            variants: true,
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
    }

    // Exclusão atômica com limpeza em cascata de todas as relações dependentes
    await prisma.$transaction(async (tx) => {
      // 1. Deletar solicitações de reset HWID associadas às chaves deste produto
      const keys = await tx.licenseKey.findMany({
        where: { productId: resolved.id },
        select: { id: true },
      });
      const keyIds = keys.map((k) => k.id);
      if (keyIds.length > 0) {
        await tx.hWIDResetRequest.deleteMany({
          where: { licenseKeyId: { in: keyIds } },
        });
      }

      // 2. Deletar todas as chaves de licença vinculadas ao produto
      await tx.licenseKey.deleteMany({
        where: { productId: resolved.id },
      });

      // 3. Deletar avaliações (reviews) e changelogs
      await tx.review.deleteMany({
        where: { productId: resolved.id },
      });
      await tx.changelog.deleteMany({
        where: { productId: resolved.id },
      });

      // 4. Desvincular do StatusService se houver
      await tx.statusService.updateMany({
        where: { productId: resolved.id },
        data: { productId: null },
      });

      // 5. Deletar itens de pedidos associados para preservar integridade referencial
      await tx.orderItem.deleteMany({
        where: { productId: resolved.id },
      });

      // 6. Deletar variantes do produto
      await tx.productVariant.deleteMany({
        where: { productId: resolved.id },
      });

      // 7. Por fim, deletar o produto
      await tx.product.delete({
        where: { id: resolved.id },
      });
    }, { timeout: 15000 });

    try {
      revalidatePath("/");
      revalidatePath("/products");
    } catch (_) {}

    return NextResponse.json({
      success: true,
      message: `Produto "${existing.name}" e todas as suas chaves/variantes foram excluídos definitivamente com sucesso.`,
    });
  } catch (error: any) {
    console.error("[ADMIN_DELETE_PRODUCT_ERROR]", error);
    return NextResponse.json({ error: `Erro ao excluir produto: ${error.message || "Falha no banco de dados."}` }, { status: 500 });
  }
}
