import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export function requireBotAuth(req: NextRequest) {
  const botSecret = process.env.INTERNAL_BOT_SECRET;

  if (!botSecret) {
    console.error("[BOT_AUTH_ERROR] INTERNAL_BOT_SECRET não configurado no servidor.");
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Configuração do servidor incompleta (INTERNAL_BOT_SECRET ausente)." },
        { status: 500 }
      ),
    };
  }

  const providedSecret = req.headers.get("x-bot-secret");

  if (!providedSecret) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Acesso não autorizado. Header x-bot-secret obrigatório." },
        { status: 401 }
      ),
    };
  }

  const secretBuffer = Buffer.from(botSecret);
  const providedBuffer = Buffer.from(providedSecret);

  if (
    secretBuffer.length !== providedBuffer.length ||
    !crypto.timingSafeEqual(secretBuffer, providedBuffer)
  ) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Acesso não autorizado. Chave secreta inválida." },
        { status: 401 }
      ),
    };
  }

  return { authorized: true, response: null };
}
