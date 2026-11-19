import { NextRequest, NextResponse } from "next/server";
import { PaymentService } from "@/services/payment.service";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const topic = url.searchParams.get("topic") || url.searchParams.get("type");
    const id = url.searchParams.get("id") || url.searchParams.get("data.id");

    const body = await req.json().catch(() => ({}));
    const paymentId = id || body?.data?.id || body?.id;

    if (!paymentId) {
      return NextResponse.json({ received: true });
    }

    const mpToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

    // Se tiver token do Mercado Pago, consulta status real na API do MP
    if (mpToken && !mpToken.startsWith("fake")) {
      const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${mpToken}` },
      });

      if (mpRes.ok) {
        const mpData = await mpRes.json();
        const status = mpData.status; // "approved", "pending", "rejected"
        const externalRef = mpData.external_reference; // orderId se configurado

        if (status === "approved") {
          // Localiza o payment no banco pelo gatewayPaymentId
          const payment = await prisma.payment.findFirst({
            where: { gatewayPaymentId: String(paymentId) },
          });

          const orderIdToConfirm = payment?.orderId || externalRef;

          if (orderIdToConfirm) {
            await PaymentService.confirmPayment({
              orderId: orderIdToConfirm,
              gatewayPaymentId: String(paymentId),
              gateway: "MERCADOPAGO",
              rawPayload: mpData,
            });
          }
        }
      }
    } else {
      // Simulação / Fallback
      const payment = await prisma.payment.findFirst({
        where: { gatewayPaymentId: String(paymentId) },
      });

      if (payment) {
        await PaymentService.confirmPayment({
          orderId: payment.orderId,
          gatewayPaymentId: String(paymentId),
          gateway: "MERCADOPAGO",
          rawPayload: body,
        });
      }
    }

    return NextResponse.json({ success: true, received: true });
  } catch (error: any) {
    console.error("[MERCADOPAGO_WEBHOOK_ERROR]", error);
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}
