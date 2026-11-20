import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = body.email ? String(body.email).trim().toLowerCase() : "";

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Informe um endereço de e-mail válido." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({
      where: {
        email: { equals: email, mode: "insensitive" },
      },
    });

    // Se o usuário existir, gera token e dispara e-mail
    if (user && user.email) {
      const token = crypto.randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + 1000 * 60 * 60); // 1 hora de validade

      // Limpa tokens antigos para este e-mail
      await prisma.verificationToken.deleteMany({
        where: { identifier: user.email },
      });

      // Salva novo token
      await prisma.verificationToken.create({
        data: {
          identifier: user.email,
          token,
          expires,
        },
      });

      // Monta URL de redefinição
      const baseUrl = process.env.NEXTAUTH_URL || "https://overclockstore.com";
      const resetUrl = `${baseUrl}/reset-password?token=${token}&email=${encodeURIComponent(user.email)}`;

      // Envia e-mail via Resend
      const resendKey = process.env.RESEND_API_KEY;
      const fromEmail = process.env.RESEND_FROM_EMAIL || "Overclock Store <onboarding@resend.dev>";

      if (resendKey && !resendKey.startsWith("fake") && !resendKey.startsWith("re_xxx")) {
        try {
          const htmlContent = `
            <div style="background-color: #050706; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1);">
              <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #ffffff; font-size: 24px; margin: 0; font-weight: 800; letter-spacing: -0.5px;">OVERCLOCK<span style="color: #10b981;">.STORE</span></h1>
                <p style="color: #86948a; font-size: 11px; margin: 4px 0 0 0; text-transform: uppercase; letter-spacing: 2px;">Recuperação de Acesso</p>
              </div>

              <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
                <h2 style="color: #ffffff; font-size: 18px; margin: 0 0 6px 0;">Redefinição de Senha</h2>
                <p style="color: #bbcabf; font-size: 13px; margin: 0;">Recebemos uma solicitação para redefinir a senha da sua conta <strong>@${user.username}</strong>.</p>
              </div>

              <p style="color: #bbcabf; font-size: 13px; line-height: 1.6; margin-bottom: 24px;">
                Para criar uma nova senha de acesso e liberar o uso do seu painel e licenças, clique no botão seguro abaixo. Este link expira em <strong>60 minutos</strong>.
              </p>

              <div style="text-align: center; margin-bottom: 28px;">
                <a href="${resetUrl}" style="background-color: #10b981; color: #050706; padding: 14px 28px; border-radius: 10px; font-weight: bold; font-size: 14px; text-decoration: none; display: inline-block;">
                  Redefinir Minha Senha
                </a>
              </div>

              <p style="color: #86948a; font-size: 11px; line-height: 1.5; margin-bottom: 24px; word-break: break-all;">
                Se o botão não funcionar, copie e cole este endereço no seu navegador:<br/>
                <a href="${resetUrl}" style="color: #10b981; text-decoration: underline;">${resetUrl}</a>
              </p>

              <div style="border-top: 1px solid rgba(255,255,255,0.08); padding-top: 20px; text-align: center; font-size: 11px; color: #86948a;">
                <p style="margin: 0 0 4px 0;">Se você não solicitou a redefinição de senha, desconsidere esta mensagem. Sua conta permanece segura.</p>
                <p style="margin: 0;">&copy; ${new Date().getFullYear()} Overclock Store. Todos os direitos reservados.</p>
              </div>
            </div>
          `;

          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${resendKey}`,
            },
            body: JSON.stringify({
              from: fromEmail,
              to: [user.email],
              subject: "🔐 Recuperação de Senha - Overclock Store",
              html: htmlContent,
            }),
          });
          console.log(`[FORGOT_PASSWORD] E-mail de recuperação enviado com sucesso para ${user.email}`);
        } catch (emailErr) {
          console.error("[FORGOT_PASSWORD_EMAIL_ERROR]", emailErr);
        }
      } else {
        console.warn(`[FORGOT_PASSWORD_DEV] RESEND_API_KEY não configurada. Link de reset: ${resetUrl}`);
      }
    }

    // Por segurança e privacidade, retornamos mensagem neutra de sucesso mesmo se o e-mail não existir
    return NextResponse.json({
      success: true,
      message: "Se o e-mail informado estiver cadastrado, você receberá um link de redefinição em sua caixa de entrada em instantes.",
    });
  } catch (error: any) {
    console.error("[FORGOT_PASSWORD_ERROR]", error);
    return NextResponse.json(
      { error: "Erro interno ao processar recuperação de senha." },
      { status: 500 }
    );
  }
}
