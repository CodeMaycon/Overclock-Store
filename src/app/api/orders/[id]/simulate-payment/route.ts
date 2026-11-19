import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PaymentService } from "@/services/payment.service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const resolved = await params;
    const orderId = resolved.id;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
    }

    if (order.status === "COMPLETED") {
      return NextResponse.json({
        success: true,
        message: "Este pedido já foi aprovado e concluído.",
      });
    }

    const latestPayment = order.payments[0];
    const gatewayPaymentId = latestPayment
      ? latestPayment.gatewayPaymentId
      : `SIMULATED-${Date.now()}`;

    // Confirma pagamento através do serviço unificado
    const result = await PaymentService.confirmPayment({
      orderId: order.id,
      gatewayPaymentId,
      gateway: "SANDBOX_SIMULATOR",
      rawPayload: { simulatedAt: new Date().toISOString(), simulatedBy: "User 1-Click Sandbox" },
    });

    return NextResponse.json({
      success: true,
      message: "Pagamento aprovado instantaneamente com sucesso no modo sandbox!",
      order: result.order,
    });
  } catch (error: any) {
    console.error("[SIMULATE_PAYMENT_ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Erro ao simular aprovação de pagamento." },
      { status: 500 }
    );
  }
}
