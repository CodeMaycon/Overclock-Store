import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/categories - Lista categorias públicas cadastradas no PostgreSQL
export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: [
        { orderPriority: "asc" },
        { name: "asc" },
      ],
    });

    return NextResponse.json({
      success: true,
      categories,
    });
  } catch (error: any) {
    console.error("[GET_CATEGORIES_ERROR]", error);
    return NextResponse.json(
      { error: "Erro ao buscar categorias." },
      { status: 500 }
    );
  }
}
