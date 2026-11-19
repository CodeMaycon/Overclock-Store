import { NextRequest, NextResponse } from "next/server";
import { PaymentService } from "@/services/payment.service";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const sig = req.headers.get("stripe-signature");

    let event: any;
    try {
      event = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const eventType = event.type;
    const dataObject = event.data?.object;

    // 1. Pagamento aprovado no Checkout Session
    if (eventType === "checkout.session.completed") {
      const orderId = dataObject.client_reference_id;
      const sessionId = dataObject.id;

      if (orderId) {
        await PaymentService.confirmPayment({
          orderId,
          gatewayPaymentId: sessionId,
          gateway: "STRIPE",
          rawPayload: dataObject,
        });
      }
    }

    // 2. Pagamento aprovado via PaymentIntent direto
    if (eventType === "payment_intent.succeeded") {
      const paymentIntentId = dataObject.id;
      const payment = await prisma.payment.findFirst({
        where: { gatewayPaymentId: paymentIntentId },
      });

      if (payment) {
        await PaymentService.confirmPayment({
          orderId: payment.orderId,
          gatewayPaymentId: paymentIntentId,
          gateway: "STRIPE",
          rawPayload: dataObject,
        });
      }
    }

    // 3. CHARGEBACK / CONTESTAÇÃO DISPARADA (Anti-Fraude & Blacklist)
    if (eventType === "charge.dispute.created" || eventType === "charge.disputed") {
      const chargeId = dataObject.charge || dataObject.id;
      const reason = dataObject.reason || "Dispute initiated on Stripe";

      await PaymentService.handleDisputeOrChargeback({
        gatewayPaymentId: chargeId,
        reason,
        rawPayload: dataObject,
      });
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("[STRIPE_WEBHOOK_ERROR]", error);
    return NextResponse.json({ error: "Stripe webhook handling error" }, { status: 500 });
  }
}
