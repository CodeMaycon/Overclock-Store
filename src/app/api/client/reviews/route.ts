import { NextRequest, NextResponse } from "next/server";
import { requireClientSession } from "@/lib/client-auth";
import { prisma } from "@/lib/prisma";
import { OrderStatus } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireClientSession();
    if (!auth.authorized) return auth.response!;

    const body = await req.json();
    const { orderId, rating, comment, productId } = body;

    if (!orderId || typeof orderId !== "string") {
      return NextResponse.json(
        { error: "Identificador do pedido é obrigatório." },
        { status: 400 }
      );
    }

    const numRating = Number(rating);
    if (!Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
      return NextResponse.json(
        { error: "A nota deve ser um número inteiro entre 1 e 5." },
        { status: 400 }
      );
    }

    if (!comment || typeof comment !== "string" || comment.trim().length < 3) {
      return NextResponse.json(
        { error: "O comentário deve ter no mínimo 3 caracteres." },
        { status: 400 }
      );
    }

    if (comment.trim().length > 1000) {
      return NextResponse.json(
        { error: "O comentário deve ter no máximo 1000 caracteres." },
        { status: 400 }
      );
    }

    // Buscar pedido diretamente no banco para garantir propriedade e status
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Pedido não encontrado." },
        { status: 404 }
      );
    }

    if (order.userId !== auth.userId) {
      return NextResponse.json(
        { error: "Você não tem permissão para avaliar este pedido." },
        { status: 403 }
      );
    }

    if (order.status !== OrderStatus.COMPLETED) {
      return NextResponse.json(
        { error: "Apenas pedidos concluídos e entregues podem ser avaliados." },
        { status: 400 }
      );
    }

    if (!order.items || order.items.length === 0) {
      return NextResponse.json(
        { error: "Nenhum produto associado a este pedido." },
        { status: 400 }
      );
    }

    // Identificar o produto avaliado
    let targetProductId = productId;
    if (targetProductId) {
      const itemMatch = order.items.find((item) => item.productId === targetProductId);
      if (!itemMatch) {
        return NextResponse.json(
          { error: "O produto indicado não pertence a este pedido." },
          { status: 400 }
        );
      }
    } else {
      targetProductId = order.items[0].productId;
    }

    // Verificar se já existe avaliação para este pedido e produto
    const existingReview = await prisma.review.findFirst({
      where: {
        userId: auth.userId!,
        orderId: order.id,
        productId: targetProductId,
      },
    });

    if (existingReview) {
      return NextResponse.json(
        { error: "Você já enviou uma avaliação para este pedido." },
        { status: 409 }
      );
    }

    // Sanitizar texto contra scripts/tags básicas
    const cleanComment = comment.trim().replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const review = await prisma.review.create({
      data: {
        userId: auth.userId!,
        orderId: order.id,
        productId: targetProductId,
        rating: numRating,
        comment: cleanComment,
        isVerifiedPurchase: true,
        isApproved: false, // Inicia pendente de moderação
      },
    });

    return NextResponse.json({
      success: true,
      message: "Avaliação enviada com sucesso! Ela será revisada pela moderação antes de ser publicada.",
      review: {
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        isApproved: review.isApproved,
        createdAt: review.createdAt,
      },
    });
  } catch (error: any) {
    console.error("[POST_CLIENT_REVIEWS_ERROR]", error);
    // Verificar conflito de chave única concorrente
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "Você já enviou uma avaliação para este pedido." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Erro interno ao registrar avaliação." },
      { status: 500 }
    );
  }
}
