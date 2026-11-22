import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";
import { slugify } from "@/lib/slug";
import { ActorType } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

// PUT /api/admin/categories/[id] - Edita uma categoria e atualiza produtos vinculados
export async function PUT(req: NextRequest, { params }: RouteParams) {
  const auth = await requireAdminSession();
  if (!auth.authorized) return auth.response!;

  const { id } = await params;

  try {
    const existing = await prisma.category.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Categoria não encontrada." }, { status: 404 });
    }

    const body = await req.json();
    const { name, description, orderPriority } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "O nome da categoria não pode ser vazio." },
        { status: 400 }
      );
    }

    const cleanName = name.trim();
    const cleanSlug = slugify(body.slug || cleanName);

    // Checa duplicidade com outras categorias
    const duplicate = await prisma.category.findFirst({
      where: {
        id: { not: id },
        OR: [{ name: cleanName }, { slug: cleanSlug }],
      },
    });

    if (duplicate) {
      return NextResponse.json(
        { error: "Já existe outra categoria com este nome ou slug." },
        { status: 409 }
      );
    }

    const oldName = existing.name;

    const updated = await prisma.$transaction(async (tx) => {
      const cat = await tx.category.update({
        where: { id },
        data: {
          name: cleanName,
          slug: cleanSlug,
          description: description !== undefined ? (description?.trim() || null) : existing.description,
          orderPriority: orderPriority !== undefined ? Number(orderPriority) : existing.orderPriority,
        },
      });

      // Se o nome da categoria mudou, atualiza retrocompativelmente os produtos vinculados
      if (oldName !== cleanName) {
        await tx.product.updateMany({
          where: { category: oldName },
          data: { category: cleanName },
        });
      }

      // Registra Auditoria
      await tx.auditLog.create({
        data: {
          userId: auth.session!.user.id,
          actorType: ActorType.ADMIN,
          action: "CATEGORY_UPDATED",
          entityType: "Category",
          entityId: id,
          metadata: {
            oldName,
            newName: cleanName,
            oldSlug: existing.slug,
            newSlug: cleanSlug,
          },
        },
      });

      return cat;
    });

    try {
      revalidatePath("/");
      revalidatePath("/products");
      revalidatePath("/status");
    } catch (_) {}

    return NextResponse.json({
      success: true,
      message: "Categoria atualizada com sucesso!",
      category: updated,
    });
  } catch (error: any) {
    console.error("[ADMIN_UPDATE_CATEGORY_ERROR]", error);
    return NextResponse.json(
      { error: "Erro ao atualizar categoria." },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/categories/[id] - Exclui uma categoria (bloqueia se houver produtos vinculados)
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const auth = await requireAdminSession();
  if (!auth.authorized) return auth.response!;

  const { id } = await params;

  try {
    const existing = await prisma.category.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Categoria não encontrada." }, { status: 404 });
    }

    // Verifica se existem produtos atrelados
    const linkedProductsCount = await prisma.product.count({
      where: { category: existing.name },
    });

    if (linkedProductsCount > 0) {
      return NextResponse.json(
        {
          error: `Não é possível excluir a categoria "${existing.name}" pois existem ${linkedProductsCount} produto(s) vinculado(s) a ela. Reclassifique os produtos antes de excluir.`,
          linkedProductsCount,
        },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.category.delete({
        where: { id },
      });

      // Registra Auditoria
      await tx.auditLog.create({
        data: {
          userId: auth.session!.user.id,
          actorType: ActorType.ADMIN,
          action: "CATEGORY_DELETED",
          entityType: "Category",
          entityId: id,
          metadata: {
            deletedName: existing.name,
            deletedSlug: existing.slug,
          },
        },
      });
    });

    try {
      revalidatePath("/");
      revalidatePath("/products");
      revalidatePath("/status");
    } catch (_) {}

    return NextResponse.json({
      success: true,
      message: `Categoria "${existing.name}" excluída com sucesso!`,
    });
  } catch (error: any) {
    console.error("[ADMIN_DELETE_CATEGORY_ERROR]", error);
    return NextResponse.json(
      { error: "Erro ao excluir categoria." },
      { status: 500 }
    );
  }
}
