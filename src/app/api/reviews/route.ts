import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const productSlug = searchParams.get("productSlug");

    const reviews = await prisma.review.findMany({
      where: {
        isApproved: true,
        ...(productSlug ? { product: { slug: productSlug } } : {}),
      },
      include: {
        product: {
          select: {
            name: true,
            slug: true,
            category: true,
          },
        },
        user: {
          select: {
            fullName: true,
            username: true,
            discordUsername: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const totalCount = reviews.length;
    const sumRatings = reviews.reduce((acc, r) => acc + r.rating, 0);
    const averageRating = totalCount > 0 ? Number((sumRatings / totalCount).toFixed(1)) : 0;

    const distribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((r) => {
      if (distribution[r.rating] !== undefined) {
        distribution[r.rating]++;
      }
    });

    const formattedReviews = reviews.map((r) => {
      // Mascarar nome para proteger privacidade (ex: "Maycon Souza" -> "Maycon S.")
      let displayName = "Cliente Verificado";
      if (r.user?.discordUsername) {
        displayName = `@${r.user.discordUsername}`;
      } else if (r.user?.fullName) {
        const parts = r.user.fullName.trim().split(" ");
        if (parts.length > 1) {
          displayName = `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
        } else {
          displayName = parts[0];
        }
      } else if (r.user?.username) {
        displayName = `@${r.user.username}`;
      }

      return {
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        isVerifiedPurchase: r.isVerifiedPurchase,
        productName: r.product.name,
        productSlug: r.product.slug,
        category: r.product.category,
        authorName: displayName,
        createdAt: r.createdAt.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }),
      };
    });

    return NextResponse.json({
      success: true,
      totalCount,
      averageRating,
      distribution,
      reviews: formattedReviews,
    });
  } catch (error: any) {
    console.error("[GET_PUBLIC_REVIEWS_ERROR]", error);
    return NextResponse.json(
      { error: "Erro ao carregar avaliações." },
      { status: 500 }
    );
  }
}
