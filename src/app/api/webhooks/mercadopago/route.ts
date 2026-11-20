import { NextRequest, NextResponse } from "next/server";
import { PaymentService } from "@/services/payment.service";
import { prisma } from "@/lib/prisma";

export async function GET() {
  return NextResponse.json({
    status: "online",
    gateway: "MERCADOPAGO",
    endpoint: "/api/webhooks/mercadopago",
    timestamp: new Date().toISOString(),
  });
}

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const queryId = url.searchParams.get("data.id") || url.searchParams.get("id");
    const queryTopic = url.searchParams.get("type") || url.searchParams.get("topic");

    const body = await req.json().catch(() => ({}));

    // 1. Trata eventos de teste de validação de URL do Mercado Pago
    const isTestEvent =
      queryTopic === "test" ||
      body?.type === "test" ||
      body?.action?.startsWith("test");

    if (isTestEvent) {
      console.log("[MERCADOPAGO_WEBHOOK] Evento de teste/validação de webhook recebido com sucesso do Mercado Pago.");
      return NextResponse.json({ received: true, test: true });
    }

    // 2. Extração segura do ID do pagamento com precedência correta
    const paymentId =
      url.searchParams.get("data.id") ||
      body?.data?.id ||
      url.searchParams.get("id") ||
      body?.id;

    console.log(
      `[MERCADOPAGO_WEBHOOK] Notificação recebida: paymentId=${paymentId || "N/A"}, topic=${queryTopic || body?.type || body?.action || "unknown"}`
    );

    if (!paymentId) {
      console.warn("[MERCADOPAGO_WEBHOOK_WARN] Nenhum ID de pagamento encontrado no payload ou query string.");
      return NextResponse.json({ received: true });
    }

    const mpToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

    // 3. Consulta de status real na API do Mercado Pago
    if (mpToken && !mpToken.startsWith("fake")) {
      const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${mpToken}` },
      });

      if (!mpRes.ok) {
        console.warn(
          `[MERCADOPAGO_WEBHOOK_WARN] Pagamento ${paymentId} não localizado na API do Mercado Pago (HTTP ${mpRes.status}). Possível ID de evento de teste ou sandbox. Retornando 200 para evitar retentativas.`
        );
        return NextResponse.json({ received: true, status: "not_found" });
      }

      const mpData = await mpRes.json();
      const status = mpData.status; // "approved", "pending", "in_process", "rejected", "cancelled", "refunded"
      const externalRef = mpData.external_reference; // orderId da Overclock Store

      console.log(
        `[MERCADOPAGO_WEBHOOK] Status verificado na API do MP para ID ${paymentId}: '${status}' | external_reference: '${externalRef || "N/A"}'`
      );

      if (status === "approved") {
        // Localiza pedido pelo gatewayPaymentId ou pelo external_reference (orderId)
        let orderIdToConfirm: string | null = null;

        const payment = await prisma.payment.findFirst({
          where: { gatewayPaymentId: String(paymentId) },
        });

        if (payment) {
          orderIdToConfirm = payment.orderId;
        } else if (externalRef) {
          orderIdToConfirm = String(externalRef);
        }

        if (orderIdToConfirm) {
          const resConfirm = await PaymentService.confirmPayment({
            orderId: orderIdToConfirm,
            gatewayPaymentId: String(paymentId),
            gateway: "MERCADOPAGO",
            rawPayload: mpData,
          });

          if (resConfirm?.alreadyCompleted) {
            console.log(
              `[MERCADOPAGO_WEBHOOK_IDEMPOTENCY] Pedido #${orderIdToConfirm} já havia sido concluído anteriormente. Nenhuma ação duplicada.`
            );
          } else {
            console.log(
              `[MERCADOPAGO_WEBHOOK_SUCCESS] Pagamento ${paymentId} APROVADO! Pedido #${orderIdToConfirm} liquidado, chave entregue e notificações disparadas!`
            );
          }
        } else {
          console.warn(
            `[MERCADOPAGO_WEBHOOK_WARN] Pagamento aprovado no MP (${paymentId}), mas nenhum pedido local encontrado com gatewayPaymentId=${paymentId} ou external_reference=${externalRef}.`
          );
        }
      } else if (status === "cancelled" || status === "rejected") {
        console.log(`[MERCADOPAGO_WEBHOOK] Pagamento ${paymentId} está '${status}'.`);
      }
    } else {
      // 4. Modo Simulação / Sandbox local
      console.log(`[MERCADOPAGO_WEBHOOK_DEV] Executando em modo dev/sandbox local para paymentId=${paymentId}.`);
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
        console.log(`[MERCADOPAGO_WEBHOOK_DEV_SUCCESS] Pedido ${payment.orderId} confirmado em ambiente de simulação.`);
      }
    }

    return NextResponse.json({ success: true, received: true });
  } catch (error: any) {
    console.error("[MERCADOPAGO_WEBHOOK_ERROR]", error);
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}
