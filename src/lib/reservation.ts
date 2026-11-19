import { prisma } from "@/lib/prisma";

/**
 * Libera automaticamente chaves de licença cujo reservedUntil já expirou
 * e cancela pedidos pendentes associados.
 */
export async function releaseExpiredReservations(): Promise<number> {
  const now = new Date();

  try {
    // 1. Encontra chaves com reserva expirada
    const expiredKeys = await prisma.licenseKey.findMany({
      where: {
        status: "RESERVED",
        reservedUntil: {
          lt: now,
        },
      },
      select: {
        id: true,
        orderId: true,
      },
    });

    if (expiredKeys.length === 0) return 0;

    const keyIds = expiredKeys.map((k) => k.id);
    const orderIds = expiredKeys
      .map((k) => k.orderId)
      .filter((id): id is string => id !== null);

    await prisma.$transaction(async (tx) => {
      // Libera chaves de volta para UNASSIGNED
      await tx.licenseKey.updateMany({
        where: { id: { in: keyIds } },
        data: {
          status: "UNASSIGNED",
          reservedUntil: null,
          orderId: null,
        },
      });

      // Cancela pedidos pendentes vinculados
      if (orderIds.length > 0) {
        await tx.order.updateMany({
          where: {
            id: { in: orderIds },
            status: "PENDING",
          },
          data: {
            status: "CANCELLED",
            cancelledAt: now,
          },
        });
      }
    });

    return expiredKeys.length;
  } catch (error) {
    console.error("[RELEASE_EXPIRED_RESERVATIONS_ERROR]", error);
    return 0;
  }
}
