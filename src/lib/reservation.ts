import { prisma } from "@/lib/prisma";
import { KeyStatus, OrderStatus } from "@prisma/client";

/**
 * Libera automaticamente chaves de licença associadas a pedidos pendentes vencidos (30 min)
 * ou chaves cujo reservedUntil já expirou, devolvendo-as ao estoque como UNASSIGNED.
 */
export async function releaseExpiredReservations(): Promise<number> {
  const now = new Date();
  const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);

  try {
    return await prisma.$transaction(async (tx) => {
      // 1. Encontra pedidos PENDING com mais de 30 minutos
      const expiredPendingOrders = await tx.order.findMany({
        where: {
          status: OrderStatus.PENDING,
          createdAt: { lt: thirtyMinutesAgo },
        },
        select: { id: true },
      });

      const expiredOrderIds = expiredPendingOrders.map((o) => o.id);

      // 2. Encontra chaves que devem ser liberadas:
      // a) Chaves em RESERVED com reservedUntil expirado (< now)
      // b) Chaves vinculadas aos pedidos PENDING que já passaram de 30 min (exceto se ativadas/concluídas)
      // c) Chaves com status RESERVED sem data ou com reservedUntil passado
      const keysToRelease = await tx.licenseKey.findMany({
        where: {
          OR: [
            {
              status: KeyStatus.RESERVED,
              reservedUntil: { lt: now },
            },
            {
              orderId: { in: expiredOrderIds },
              status: { in: [KeyStatus.RESERVED, KeyStatus.UNASSIGNED] },
            },
          ],
        },
        select: { id: true, orderId: true },
      });

      const keyIds = keysToRelease.map((k) => k.id);

      // 3. Devolve todas essas chaves para UNASSIGNED, orderId = null, userId = null, reservedUntil = null
      if (keyIds.length > 0) {
        await tx.licenseKey.updateMany({
          where: { id: { in: keyIds } },
          data: {
            status: KeyStatus.UNASSIGNED,
            reservedUntil: null,
            orderId: null,
            userId: null,
          },
        });
      }

      // 4. Marca os pedidos PENDING vencidos como CANCELLED
      if (expiredOrderIds.length > 0) {
        await tx.order.updateMany({
          where: {
            id: { in: expiredOrderIds },
            status: OrderStatus.PENDING,
          },
          data: {
            status: OrderStatus.CANCELLED,
            cancelledAt: now,
          },
        });
      }

      return keyIds.length;
    });
  } catch (error) {
    console.error("[RELEASE_EXPIRED_RESERVATIONS_ERROR]", error);
    return 0;
  }
}
