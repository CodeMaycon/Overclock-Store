import { NextRequest, NextResponse } from "next/server";
import { PaymentService } from "@/services/payment.service";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    // NOWPayments: payment_status === 'finished' | 'confirmed'
    // Coinbase Commerce: event.type === 'charge:confirmed'
    const nowPaymentStatus = body?.payment_status;
    const coinbaseType = body?.event?.type;

    let orderId: string | null = null;
    let gatewayPaymentId: string | null = null;

    if (nowPaymentStatus === "finished" || nowPaymentStatus === "confirmed") {
      orderId = body.order_id;
      gatewayPaymentId = String(body.payment_id);
    } else if (coinbaseType === "charge:confirmed") {
      const charge = body.event?.data;
      orderId = charge?.metadata?.order_id || charge?.metadata?.orderId;
      gatewayPaymentId = charge?.id;
    }

    if (orderId && gatewayPaymentId) {
      await PaymentService.confirmPayment({
        orderId,
        gatewayPaymentId,
        gateway: "CRYPTO",
        rawPayload: body,
      });
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("[CRYPTO_WEBHOOK_ERROR]", error);
    return NextResponse.json({ error: "Crypto webhook handling error" }, { status: 500 });
  }
}
