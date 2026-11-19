import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

export async function requireAdminSession() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Acesso não autorizado. Faça login primeiro." },
        { status: 401 }
      ),
      session: null,
    };
  }

  if (session.user.role !== Role.ADMIN) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Acesso negado. Esta operação exige privilégios de Administrador." },
        { status: 403 }
      ),
      session,
    };
  }

  return { authorized: true, response: null, session };
}
