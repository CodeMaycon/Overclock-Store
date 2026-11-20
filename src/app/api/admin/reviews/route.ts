import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdminSession();
    if (!auth.authorized) return auth.response!;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status"); // "PENDING", "APPROVED", or "ALL"

    const whereClause: any = {};
    if (status === "PENDING") {
      whereClause.isApproved = false;
    } else if (status === "APPROVED") {
      whereClause.isApproved = true;
    }

    const reviews = await prisma.review.findMany({
      where: whereClause,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        user: {
          select: {
            id: true,
            fullName: true,
            username: true,
            email: true,
          },
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const counts = {
      all: await prisma.review.count(),
      pending: await prisma.review.count({ where: { isApproved: false } }),
      approved: await prisma.review.count({ where: { isApproved: true } }),
    };

    return NextResponse.json({
      success: true,
      reviews,
      counts,
    });
  } catch (error: any) {
    console.error("[GET_ADMIN_REVIEWS_ERROR]", error);
    return NextResponse.json(
      { error: "Erro ao buscar avaliações no painel administrativo." },
      { status: 500 }
    );
  }
}
