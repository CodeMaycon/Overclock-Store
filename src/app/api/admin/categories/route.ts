import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";
import { slugify } from "@/lib/slug";
import { ActorType } from "@prisma/client";

export const dynamic = "force-dynamic";

// GET /api/admin/categories - Lista categorias com contagem de produtos vinculados
export async function GET() {
  const auth = await requireAdminSession();
  if (!auth.authorized) return auth.response!;

  try {
    const categories = await prisma.category.findMany({
      orderBy: [
        { orderPriority: "asc" },
        { name: "asc" },
      ],
    });

    // Contabiliza produtos associados a cada categoria pelo nome
    const products = await prisma.product.findMany({
      select: { category: true },
    });

    const countMap: Record<string, number> = {};
    for (const p of products) {
      countMap[p.category] = (countMap[p.category] || 0) + 1;
    }

    const categoriesWithCount = categories.map((c) => ({
      ...c,
      productCount: countMap[c.name] || 0,
    }));

    return NextResponse.json({
      success: true,
      categories: categoriesWithCount,
    });
  } catch (error: any) {
    console.error("[ADMIN_GET_CATEGORIES_ERROR]", error);
    return NextResponse.json(
      { error: "Erro ao carregar categorias." },
      { status: 500 }
    );
  }
}

// POST /api/admin/categories - Cria uma nova categoria no PostgreSQL
export async function POST(req: NextRequest) {
  const auth = await requireAdminSession();
  if (!auth.authorized) return auth.response!;

  try {
    const body = await req.json();
    const { name, description, orderPriority } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "O nome da categoria é obrigatório." },
        { status: 400 }
      );
    }

    const cleanName = name.trim();
    const cleanSlug = slugify(body.slug || cleanName);

    if (!cleanSlug) {
      return NextResponse.json(
        { error: "Nome inválido para gerar o slug da categoria." },
        { status: 400 }
      );
    }

    // Verifica se já existe com este nome ou slug
    const existing = await prisma.category.findFirst({
      where: {
        OR: [{ name: cleanName }, { slug: cleanSlug }],
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Já existe uma categoria cadastrada com este nome ou slug." },
        { status: 409 }
      );
    }

    const category = await prisma.$transaction(async (tx) => {
      const created = await tx.category.create({
        data: {
          name: cleanName,
          slug: cleanSlug,
          description: description?.trim() || null,
          orderPriority: Number(orderPriority) || 0,
        },
      });

      // Registra Auditoria
      await tx.auditLog.create({
        data: {
          userId: auth.session!.user.id,
          actorType: ActorType.ADMIN,
          action: "CATEGORY_CREATED",
          entityType: "Category",
          entityId: created.id,
          metadata: {
            name: created.name,
            slug: created.slug,
          },
        },
      });

      return created;
    });

    try {
      revalidatePath("/");
      revalidatePath("/products");
      revalidatePath("/status");
    } catch (_) {}

    return NextResponse.json(
      {
        success: true,
        message: "Categoria criada com sucesso!",
        category,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[ADMIN_CREATE_CATEGORY_ERROR]", error);
    return NextResponse.json(
      { error: "Erro ao criar categoria no banco de dados." },
      { status: 500 }
    );
  }
}
