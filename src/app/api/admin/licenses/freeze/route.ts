import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";
import { KeyStatus, ProductStatus, ServiceHealthStatus } from "@prisma/client";

// POST /api/admin/licenses/freeze - Aciona congelamento ou descongelamento de tempo
export async function POST(req: NextRequest) {
  const auth = await requireAdminSession();
  if (!auth.authorized) return auth.response!;

  try {
    const body = await req.json();
    const { productId, action = "freeze", reason = "Atualização de patch do jogo" } = body;

    if (!productId) {
      return NextResponse.json({ error: "Produto alvo é obrigatório." }, { status: 400 });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { statusService: true },
    });

    if (!product) {
      return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
    }

    const now = new Date();

    if (action === "freeze") {
      // 1. Atualiza status do produto para MAINTENANCE
      await prisma.product.update({
        where: { id: productId },
        data: { status: ProductStatus.MAINTENANCE },
      });

      // 2. Localiza chaves ativas do produto
      const activeKeys = await prisma.licenseKey.findMany({
        where: {
          productId,
          status: KeyStatus.ACTIVE,
        },
      });

      // 3. Marca chaves como FROZEN e inicia freezeStartedAt
      if (activeKeys.length > 0) {
        await prisma.licenseKey.updateMany({
          where: {
            id: { in: activeKeys.map((k) => k.id) },
          },
          data: {
            status: KeyStatus.FROZEN,
            freezeStartedAt: now,
          },
        });
      }

      // 4. Se houver serviço de telemetria vinculado, sinaliza manutenção
      if (product.statusService) {
        await prisma.statusService.update({
          where: { id: product.statusService.id },
          data: { status: ServiceHealthStatus.MAINTENANCE },
        });

        await prisma.statusIncident.create({
          data: {
            serviceId: product.statusService.id,
            title: `Manutenção Preventiva - ${product.name}`,
            description: reason || "Módulo em validação de integridade. Freeze Time ativo para todos os clientes.",
            status: ServiceHealthStatus.MAINTENANCE,
          },
        });
      }

      return NextResponse.json({
        success: true,
        action: "freeze",
        message: `Freeze Time ativado para ${product.name}! ${activeKeys.length} licenças foram pausadas sem perda de tempo.`,
        frozenKeysCount: activeKeys.length,
      });
    } else if (action === "unfreeze") {
      // 1. Volta status do produto para ONLINE
      await prisma.product.update({
        where: { id: productId },
        data: { status: ProductStatus.ONLINE },
      });

      // 2. Localiza chaves congeladas do produto
      const frozenKeys = await prisma.licenseKey.findMany({
        where: {
          productId,
          status: KeyStatus.FROZEN,
        },
      });

      let updatedCount = 0;

      // 3. Para cada chave, recalcula a validade estendendo o tempo de freeze
      for (const k of frozenKeys) {
        const freezeStart = k.freezeStartedAt ? new Date(k.freezeStartedAt).getTime() : now.getTime();
        const frozenSeconds = Math.max(0, Math.floor((now.getTime() - freezeStart) / 1000));

        let newExpiresAt = k.expiresAt;
        if (newExpiresAt) {
          newExpiresAt = new Date(new Date(newExpiresAt).getTime() + frozenSeconds * 1000);
        }

        await prisma.licenseKey.update({
          where: { id: k.id },
          data: {
            status: KeyStatus.ACTIVE,
            freezeStartedAt: null,
            totalFrozenSeconds: (k.totalFrozenSeconds || 0) + frozenSeconds,
            expiresAt: newExpiresAt,
          },
        });
        updatedCount++;
      }

      // 4. Restaura serviço de status
      if (product.statusService) {
        await prisma.statusService.update({
          where: { id: product.statusService.id },
          data: { status: ServiceHealthStatus.OPERATIONAL },
        });

        // Resolve incidentes pendentes
        await prisma.statusIncident.updateMany({
          where: {
            serviceId: product.statusService.id,
            isResolved: false,
          },
          data: {
            isResolved: true,
            resolvedAt: now,
          },
        });
      }

      return NextResponse.json({
        success: true,
        action: "unfreeze",
        message: `Serviço ${product.name} restabelecido! ${updatedCount} licenças foram retomadas com o tempo compensado.`,
        unfrozenKeysCount: updatedCount,
      });
    }

    return NextResponse.json({ error: "Ação inválida. Escolha 'freeze' ou 'unfreeze'." }, { status: 400 });
  } catch (error: any) {
    console.error("[ADMIN_FREEZE_KEYS_ERROR]", error);
    return NextResponse.json(
      { error: "Erro ao executar protocolo de Freeze Time." },
      { status: 500 }
    );
  }
}
