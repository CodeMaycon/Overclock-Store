import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const token = body.token ? String(body.token).trim() : "";
    const email = body.email ? String(body.email).trim().toLowerCase() : "";
    const password = body.password ? String(body.password) : "";

    if (!token || !email) {
      return NextResponse.json(
        { error: "Token de verificação e e-mail são obrigatórios." },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: "A nova senha deve ter no mínimo 6 caracteres." },
        { status: 400 }
      );
    }

    // Busca o token de verificação válido
    const verificationRecord = await prisma.verificationToken.findFirst({
      where: {
        token,
        identifier: email,
      },
    });

    if (!verificationRecord) {
      return NextResponse.json(
        { error: "Link de redefinição inválido ou inexistente. Solicite um novo link." },
        { status: 400 }
      );
    }

    // Verifica se expirou
    if (new Date() > verificationRecord.expires) {
      await prisma.verificationToken.deleteMany({
        where: { token, identifier: email },
      });
      return NextResponse.json(
        { error: "Este link de redefinição expirou. Solicite um novo link de recuperação." },
        { status: 400 }
      );
    }

    // Localiza o usuário correspondente
    const user = await prisma.user.findFirst({
      where: {
        email: { equals: email, mode: "insensitive" },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não encontrado." },
        { status: 404 }
      );
    }

    // Criptografa nova senha com salt 12
    const hashedPassword = await bcrypt.hash(password, 12);

    // Atualiza a senha no banco e remove o token de uso único
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: hashedPassword },
      }),
      prisma.verificationToken.deleteMany({
        where: { identifier: email },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Senha redefinida com sucesso! Você já pode entrar com sua nova senha.",
    });
  } catch (error: any) {
    console.error("[RESET_PASSWORD_ERROR]", error);
    return NextResponse.json(
      { error: "Erro interno ao redefinir senha." },
      { status: 500 }
    );
  }
}
