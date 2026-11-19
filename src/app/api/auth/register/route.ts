import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, fullName, email, password } = body;

    // 1. Validações básicas de presença
    if (!username || !fullName || !email || !password) {
      return NextResponse.json(
        { error: "Todos os campos são obrigatórios." },
        { status: 400 }
      );
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();
    const cleanFullName = fullName.trim();

    // 2. Validações de formato
    if (cleanUsername.length < 3 || cleanUsername.length > 20) {
      return NextResponse.json(
        { error: "O nome de usuário deve conter entre 3 e 20 caracteres." },
        { status: 400 }
      );
    }

    if (!/^[a-z0-9_]+$/.test(cleanUsername)) {
      return NextResponse.json(
        { error: "O nome de usuário pode conter apenas letras, números e underline (_)." },
        { status: 400 }
      );
    }

    const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    if (!EMAIL_REGEX.test(cleanEmail)) {
      return NextResponse.json(
        { error: "Informe um endereço de e-mail válido (ex: seu_nome@dominio.com)." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "A senha deve conter no mínimo 6 caracteres." },
        { status: 400 }
      );
    }

    // 3. Verificação de Blacklist
    const isBlacklisted = await prisma.blacklist.findFirst({
      where: {
        OR: [
          { value: cleanEmail },
          { value: cleanUsername },
        ],
      },
    });

    if (isBlacklisted) {
      return NextResponse.json(
        { error: "Não foi possível concluir o cadastro devido a restrições de segurança." },
        { status: 403 }
      );
    }

    // 4. Verificação de Unicidade
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: cleanEmail },
          { username: cleanUsername },
        ],
      },
    });

    if (existingUser) {
      if (existingUser.email.toLowerCase() === cleanEmail) {
        return NextResponse.json(
          { error: "Este endereço de e-mail já está em uso." },
          { status: 409 }
        );
      }
      if (existingUser.username.toLowerCase() === cleanUsername) {
        return NextResponse.json(
          { error: "Este nome de usuário já está em uso por outro membro." },
          { status: 409 }
        );
      }
    }

    // 5. Hash de Senha Seguro
    const passwordHash = await bcrypt.hash(password, 10);

    // 6. Criação do Usuário
    const newUser = await prisma.user.create({
      data: {
        username: cleanUsername,
        fullName: cleanFullName,
        email: cleanEmail,
        passwordHash,
        role: Role.CUSTOMER,
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Conta criada com sucesso!",
        user: newUser,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[REGISTER_API_ERROR]", error);
    return NextResponse.json(
      { error: "Ocorreu um erro interno ao processar seu cadastro." },
      { status: 500 }
    );
  }
}
