import { prisma } from "@/lib/prisma";
import { PaymentGateway, PaymentMethod, PaymentStatus, OrderStatus, KeyStatus, BlacklistType, ActorType } from "@prisma/client";
import { DiscordService } from "@/services/discord.service";

export interface CreatePaymentInput {
  orderId: string;
  orderNumber: string;
  amountCents: number;
  customerEmail: string;
  customerName: string;
  gateway: "MERCADOPAGO" | "STRIPE" | "CRYPTO";
  method: "PIX" | "CREDIT_CARD" | "CRYPTO";
  appUrl: string;
}

export interface PaymentGatewayResult {
  gatewayPaymentId: string;
  checkoutUrl?: string;
  pixQrCode?: string;
  pixQrCodeText?: string;
  pixExpiresAt?: Date;
  cryptoAddress?: string;
  isSandbox: boolean;
}

export class PaymentService {
  /**
   * Inicializa o pagamento no gateway escolhido ou entra em modo sandbox de simulação
   */
  static async createPayment(input: CreatePaymentInput): Promise<PaymentGatewayResult> {
    const isDevelopment = process.env.NODE_ENV !== "production";
    const mpToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const cryptoKey = process.env.NOWPAYMENTS_API_KEY || process.env.COINBASE_COMMERCE_API_KEY;

    // 1. MERCADO PAGO (PIX)
    if (input.gateway === "MERCADOPAGO" || input.method === "PIX") {
      if (mpToken && !mpToken.startsWith("fake")) {
        try {
          const res = await fetch("https://api.mercadopago.com/v1/payments", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${mpToken}`,
              "X-Idempotency-Key": `order-${input.orderId}-${Date.now()}`,
            },
            body: JSON.stringify({
              transaction_amount: Number((input.amountCents / 100).toFixed(2)),
              description: `Overclock Store - Pedido #${input.orderNumber}`,
              payment_method_id: "pix",
              payer: {
                email: input.customerEmail,
                first_name: input.customerName.split(" ")[0] || "Cliente",
                last_name: input.customerName.split(" ").slice(1).join(" ") || "Overclock",
              },
              external_reference: input.orderId,
              notification_url: `${input.appUrl}/api/webhooks/mercadopago`,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            return {
              gatewayPaymentId: String(data.id),
              pixQrCode: data.point_of_interaction?.transaction_data?.qr_code_base64,
              pixQrCodeText: data.point_of_interaction?.transaction_data?.qr_code,
              pixExpiresAt: data.date_of_expiration ? new Date(data.date_of_expiration) : new Date(Date.now() + 15 * 60 * 1000),
              isSandbox: false,
            };
          }
        } catch (err) {
          console.error("[MERCADOPAGO_API_ERROR]", err);
        }
      }

      // Sandbox Fallback para Pix
      const dummyPixPayload = `00020126580014br.gov.bcb.pix0136overclock-sandbox-${input.orderNumber}520400005303986540${(input.amountCents / 100).toFixed(2)}5802BR5915OVERCLOCK STORE6009SAO PAULO62070503***6304ABCD`;
      return {
        gatewayPaymentId: `SANDBOX-MP-${Date.now()}`,
        pixQrCode: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><rect width='200' height='200' fill='white'/><text x='50%' y='50%' font-size='14' text-anchor='middle' fill='black'>PIX SANDBOX OVERCLOCK</text></svg>",
        pixQrCodeText: dummyPixPayload,
        pixExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
        isSandbox: true,
      };
    }

    // 2. STRIPE (CARTÃO DE CRÉDITO VIA CHECKOUT SESSION)
    if (input.gateway === "STRIPE" || input.method === "CREDIT_CARD") {
      if (stripeKey && !stripeKey.startsWith("fake")) {
        try {
          const bodyParams = new URLSearchParams();
          bodyParams.append("payment_method_types[0]", "card");
          bodyParams.append("line_items[0][price_data][currency]", "brl");
          bodyParams.append("line_items[0][price_data][product_data][name]", `Licença Overclock Store - Pedido #${input.orderNumber}`);
          bodyParams.append("line_items[0][price_data][unit_amount]", String(input.amountCents));
          bodyParams.append("line_items[0][quantity]", "1");
          bodyParams.append("mode", "payment");
          bodyParams.append("customer_email", input.customerEmail);
          bodyParams.append("client_reference_id", input.orderId);
          bodyParams.append("success_url", `${input.appUrl}/order/${input.orderId}?payment=success`);
          bodyParams.append("cancel_url", `${input.appUrl}/order/${input.orderId}?payment=cancelled`);

          const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${stripeKey}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: bodyParams.toString(),
          });

          if (res.ok) {
            const data = await res.json();
            return {
              gatewayPaymentId: data.id,
              checkoutUrl: data.url,
              isSandbox: false,
            };
          }
        } catch (err) {
          console.error("[STRIPE_API_ERROR]", err);
        }
      }

      // Sandbox Fallback para Stripe
      return {
        gatewayPaymentId: `SANDBOX-STRIPE-${Date.now()}`,
        checkoutUrl: `${input.appUrl}/order/${input.orderId}?simulated=true`,
        isSandbox: true,
      };
    }

    // 3. CRIPTO (COINBASE / NOWPAYMENTS)
    return {
      gatewayPaymentId: `SANDBOX-CRYPTO-${Date.now()}`,
      checkoutUrl: `${input.appUrl}/order/${input.orderId}?simulated=true`,
      cryptoAddress: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
      isSandbox: true,
    };
  }

  /**
   * Confirmação atômica e idempotente de pagamento
   */
  static async confirmPayment(params: {
    orderId: string;
    gatewayPaymentId: string;
    gateway: string;
    rawPayload?: any;
  }) {
    const { orderId, gatewayPaymentId, gateway, rawPayload } = params;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Busca pedido com seus itens e pagamentos
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          payments: true,
          items: true,
          coupon: true,
        },
      });

      if (!order) {
        throw new Error(`Pedido ${orderId} não encontrado.`);
      }

      // Se já concluído, garante idempotência e retorna
      if (order.status === OrderStatus.COMPLETED) {
        return { alreadyCompleted: true, order };
      }

      const now = new Date();

      // 2. Atualiza ou cria Payment como PAID
      const existingPayment = order.payments.find(
        (p) => p.gatewayPaymentId === gatewayPaymentId || p.status === PaymentStatus.PENDING
      );

      if (existingPayment) {
        await tx.payment.update({
          where: { id: existingPayment.id },
          data: {
            status: PaymentStatus.PAID,
            paidAt: now,
            rawPayload: rawPayload || undefined,
          },
        });
      }

      // 3. Atualiza Order para COMPLETED
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.COMPLETED,
          paidAt: now,
        },
      });

      // 4. Transiciona a chave reservada para NOT_ACTIVATED
      let targetKey = await tx.licenseKey.findFirst({
        where: {
          orderId: order.id,
          status: KeyStatus.RESERVED,
        },
      });

      if (targetKey) {
        targetKey = await tx.licenseKey.update({
          where: { id: targetKey.id },
          data: {
            status: KeyStatus.NOT_ACTIVATED,
            userId: order.userId,
            reservedUntil: null,
          },
        });
      } else {
        // Fallback resiliente: caso a chave reservada tenha expirado a reserva ou esteja desvinculada
        const existingKey = await tx.licenseKey.findFirst({
          where: { orderId: order.id },
        });

        if (existingKey) {
          targetKey = await tx.licenseKey.update({
            where: { id: existingKey.id },
            data: {
              status: KeyStatus.NOT_ACTIVATED,
              userId: order.userId,
              reservedUntil: null,
            },
          });
        } else if (order.items.length > 0) {
          const primaryItem = order.items[0];
          const availableKey = await tx.licenseKey.findFirst({
            where: {
              productId: primaryItem.productId,
              variantId: primaryItem.variantId,
              status: KeyStatus.UNASSIGNED,
            },
          });

          if (availableKey) {
            targetKey = await tx.licenseKey.update({
              where: { id: availableKey.id },
              data: {
                status: KeyStatus.NOT_ACTIVATED,
                orderId: order.id,
                userId: order.userId,
                reservedUntil: null,
              },
            });
          }
        }
      }

      // 5. Incrementa cupom se utilizado
      if (order.couponId) {
        await tx.coupon.update({
          where: { id: order.couponId },
          data: {
            usedCount: { increment: 1 },
          },
        });
      }

      // 6. Registra no AuditLog
      await tx.auditLog.create({
        data: {
          userId: order.userId,
          actorType: ActorType.SYSTEM,
          action: "PAYMENT_CONFIRMED",
          entityType: "Order",
          entityId: order.id,
          metadata: {
            gateway,
            gatewayPaymentId,
            totalCents: order.totalCents,
            keyAssignedId: targetKey?.id,
          },
        },
      });

      return { alreadyCompleted: false, order: updatedOrder };
    }, { timeout: 15000, maxWait: 10000 });

    // Sincronização pós-confirmação com Discord e Webhook Administrativo
    if (result && !result.alreadyCompleted && result.order) {
      try {
        const fullOrder = await prisma.order.findUnique({
          where: { id: result.order.id },
          include: {
            user: true,
            items: { include: { product: true } },
            payments: { take: 1, orderBy: { createdAt: "desc" } },
          },
        });

        if (fullOrder && fullOrder.user) {
          const productNames = fullOrder.items.map((i) => i.product.name).join(", ");
          await DiscordService.sendAdminWebhook({
            title: "💎 Nova Venda Concluída!",
            description: `Pedido **#${fullOrder.orderNumber}** liquidado com sucesso.`,
            fields: [
              { name: "Cliente", value: `${fullOrder.user.fullName} (@${fullOrder.user.username})`, inline: true },
              { name: "E-mail", value: fullOrder.user.email, inline: true },
              { name: "Valor Total", value: `R$ ${(fullOrder.totalCents / 100).toFixed(2).replace(".", ",")}`, inline: true },
              { name: "Produto(s)", value: productNames || "Licença Overclock", inline: false },
              { name: "Gateway", value: `${gateway} (${fullOrder.payments[0]?.method || "PIX"})`, inline: true },
              { name: "Discord", value: fullOrder.user.discordId ? `@${fullOrder.user.discordUsername || fullOrder.user.discordId}` : "Não vinculado", inline: true },
            ],
            color: 0x10b981,
          });

          if (fullOrder.user.discordId) {
            const discordId = fullOrder.user.discordId;
            const productRoles = fullOrder.items
              .map((it) => it.product.discordRoleId)
              .filter((roleId): roleId is string => Boolean(roleId));

            await DiscordService.syncRoles(discordId, productRoles);
          }

          // Disparo de e-mail de entrega via Resend
          try {
            const deliveredKey = await prisma.licenseKey.findFirst({
              where: { orderId: fullOrder.id },
            });

            if (deliveredKey && fullOrder.user.email) {
              const primaryItem = fullOrder.items[0];
              await PaymentService.sendDeliveryEmail({
                toEmail: fullOrder.user.email,
                customerName: fullOrder.user.fullName || fullOrder.user.username,
                orderNumber: fullOrder.orderNumber,
                productName: primaryItem?.product?.name || "Software Overclock",
                variantName: primaryItem?.variantId ? "Plano Ativo" : "Licença",
                licenseKey: deliveredKey.key,
                amountFormatted: `R$ ${(fullOrder.totalCents / 100).toFixed(2).replace(".", ",")}`,
              });
            }
          } catch (emailErr) {
            console.error("[CONFIRM_PAYMENT_EMAIL_ERR]", emailErr);
          }
        }
      } catch (err) {
        console.warn("[CONFIRM_PAYMENT_DISCORD_SYNC_WARN]", err);
      }
    }

    return result;
  }

  /**
   * Disparo de e-mail transacional via Resend REST API
   */
  static async sendDeliveryEmail(params: {
    toEmail: string;
    customerName: string;
    orderNumber: string;
    productName: string;
    variantName: string;
    licenseKey: string;
    amountFormatted: string;
  }) {
    const resendKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || "Overclock Store <onboarding@resend.dev>";

    if (!resendKey || resendKey.startsWith("re_xxx") || resendKey.startsWith("fake")) {
      console.log(`[RESEND_EMAIL_SKIPPED] Chave RESEND_API_KEY não configurada ou de exemplo. E-mail de entrega não enviado para ${params.toEmail}.`);
      return;
    }

    try {
      const appUrl = process.env.NEXTAUTH_URL || "https://overclockstore.com";
      const htmlContent = `
        <div style="background-color: #050706; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1);">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #ffffff; font-size: 24px; margin: 0; font-weight: 800; letter-spacing: -0.5px;">OVERCLOCK<span style="color: #10b981;">.STORE</span></h1>
            <p style="color: #86948a; font-size: 11px; margin: 4px 0 0 0; text-transform: uppercase; letter-spacing: 2px;">Licença Digital Liberada</p>
          </div>

          <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
            <p style="color: #10b981; font-size: 12px; font-weight: 700; margin: 0 0 6px 0; text-transform: uppercase;">Pagamento Aprovado Instantaneamente</p>
            <h2 style="color: #ffffff; font-size: 18px; margin: 0 0 4px 0;">Pedido #${params.orderNumber}</h2>
            <p style="color: #bbcabf; font-size: 13px; margin: 0;">Olá, <strong>${params.customerName}</strong>! Seu software já está disponível para uso.</p>
          </div>

          <div style="background-color: #0b0f0d; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <div style="margin-bottom: 16px; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 12px;">
              <span style="color: #86948a; font-size: 11px; text-transform: uppercase; display: block;">Produto Adquirido:</span>
              <strong style="color: #ffffff; font-size: 15px;">${params.productName}</strong> <span style="color: #10b981; font-size: 12px;">(${params.variantName})</span>
            </div>

            <div>
              <span style="color: #86948a; font-size: 11px; text-transform: uppercase; display: block; margin-bottom: 6px;">Sua Chave de Ativação Digital:</span>
              <div style="background-color: #050706; border: 1px solid #10b981; border-radius: 8px; padding: 14px; font-family: monospace; font-size: 16px; font-weight: bold; color: #10b981; text-align: center; letter-spacing: 1.5px; word-break: break-all;">
                ${params.licenseKey}
              </div>
            </div>
          </div>

          <div style="text-align: center; margin-bottom: 24px;">
            <a href="${appUrl}/dashboard" style="background-color: #10b981; color: #050706; padding: 14px 28px; border-radius: 10px; font-weight: bold; font-size: 14px; text-decoration: none; display: inline-block;">
              Acessar Painel do Cliente & Minhas Licenças
            </a>
          </div>

          <div style="border-top: 1px solid rgba(255,255,255,0.08); padding-top: 20px; text-align: center; font-size: 12px; color: #86948a; line-height: 1.6;">
            <p style="margin: 0 0 8px 0;">Dúvidas ou suporte? Entre no nosso Discord oficial: <a href="https://discord.gg/gqMDjvaSC" style="color: #10b981; text-decoration: none;">discord.gg/gqMDjvaSC</a></p>
            <p style="margin: 0;">&copy; ${new Date().getFullYear()} Overclock Store. Todos os direitos reservados.</p>
          </div>
        </div>
      `;

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [params.toEmail],
          subject: `⚡ Sua Licença Overclock Store - Pedido #${params.orderNumber}`,
          html: htmlContent,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        console.log(`[RESEND_EMAIL_SUCCESS] E-mail de entrega enviado para ${params.toEmail}. Resend ID: ${data.id}`);
      } else {
        const errData = await res.json().catch(() => ({}));
        console.error(`[RESEND_EMAIL_ERROR] Falha ao enviar e-mail via Resend:`, errData);
      }
    } catch (err) {
      console.error(`[RESEND_EMAIL_EXCEPTION]`, err);
    }
  }

  /**
   * Tratamento de Chargeback / Contestação (Stripe dispute)
   */
  static async handleDisputeOrChargeback(params: {
    gatewayPaymentId: string;
    reason?: string;
    rawPayload?: any;
  }) {
    const { gatewayPaymentId, reason, rawPayload } = params;

    return await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { gatewayPaymentId },
        include: {
          order: {
            include: {
              licenseKeys: true,
              user: true,
            },
          },
        },
      });

      if (!payment || !payment.order) return null;

      const order = payment.order;
      const user = order.user;

      // 1. Marca pagamento como CHARGEBACK e pedido como DISPUTED
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.CHARGEBACK,
          rawPayload: rawPayload || undefined,
        },
      });

      await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.DISPUTED,
        },
      });

      // 2. Revoga todas as chaves associadas
      await tx.licenseKey.updateMany({
        where: { orderId: order.id },
        data: {
          status: KeyStatus.REVOKED,
          notes: `Revogada automaticamente por chargeback: ${reason || "Contestação de pagamento"}`,
        },
      });

      // 3. Adiciona usuário e IP à Blacklist
      if (user.email) {
        await tx.blacklist.upsert({
          where: { type_value: { type: BlacklistType.EMAIL, value: user.email } },
          create: {
            type: BlacklistType.EMAIL,
            value: user.email,
            reason: `Chargeback no pedido ${order.orderNumber}: ${reason || "Contestação de pagamento"}`,
          },
          update: {},
        });
      }

      if (order.customerIp) {
        await tx.blacklist.upsert({
          where: { type_value: { type: BlacklistType.IP, value: order.customerIp } },
          create: {
            type: BlacklistType.IP,
            value: order.customerIp,
            reason: `Chargeback no pedido ${order.orderNumber}`,
          },
          update: {},
        });
      }

      // 4. Registra no AuditLog
      await tx.auditLog.create({
        data: {
          userId: user.id,
          actorType: ActorType.SYSTEM,
          action: "CHARGEBACK_DETECTED_BLACKLISTED",
          entityType: "Order",
          entityId: order.id,
          metadata: {
            gatewayPaymentId,
            reason,
          },
        },
      });

      return { disputed: true, orderId: order.id };
    });
  }
}
