import { NextRequest, NextResponse } from "next/server";
import { requireBotAuth } from "@/lib/bot-auth";
import { prisma } from "@/lib/prisma";
import { releaseExpiredReservations } from "@/lib/reservation";
import { ProductStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  const auth = requireBotAuth(req);
  if (!auth.authorized) return auth.response!;

  // 1. Roda limpeza de reservas expiradas antes de consultar estoque
  await releaseExpiredReservations();

  // 2. Busca produtos ativos (não DISABLED)
  const products = await prisma.product.findMany({
    where: {
      status: {
        not: ProductStatus.DISABLED,
      },
    },
    include: {
      variants: {
        where: { isActive: true },
        orderBy: { orderPriority: "asc" },
      },
    },
    orderBy: { orderPriority: "asc" },
  });

  // 3. Monta resposta com contagem real de chaves UNASSIGNED por variante
  const result = await Promise.all(
    products.map(async (prod) => {
      const variantsWithStock = await Promise.all(
        prod.variants.map(async (v) => {
          const unassignedCount = await prisma.licenseKey.count({
            where: {
              variantId: v.id,
              status: "UNASSIGNED",
            },
          });

          return {
            id: v.id,
            name: v.name,
            licenseType: v.durationType,
            priceCents: v.priceCents,
            price: v.priceCents / 100,
            priceFormatted: `R$ ${(v.priceCents / 100).toFixed(2).replace(".", ",")}`,
            stock: unassignedCount,
            inStock: unassignedCount > 0,
          };
        })
      );

      return {
        id: prod.id,
        name: prod.name,
        slug: prod.slug,
        shortDescription: prod.shortDescription,
        status: prod.status,
        category: prod.category,
        variants: variantsWithStock,
      };
    })
  );

  return NextResponse.json({
    success: true,
    total: result.length,
    products: result,
  });
}
