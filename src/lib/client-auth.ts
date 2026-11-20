import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function requireClientSession() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.id) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Acesso não autorizado. Faça login primeiro." },
        { status: 401 }
      ),
      session: null,
      userId: null,
    };
  }

  if (session.user.isBanned) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Sua conta foi suspensa por violação dos termos de uso e segurança." },
        { status: 403 }
      ),
      session,
      userId: session.user.id,
    };
  }

  return { authorized: true, response: null, session, userId: session.user.id };
}
