import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 dias
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Credenciais Overclock",
      credentials: {
        identifier: { label: "E-mail ou Usuário", type: "text" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.password) {
          throw new Error("Informe seu e-mail/usuário e senha.");
        }

        const identifier = credentials.identifier.trim().toLowerCase();

        // 1. Localiza usuário por email ou username
        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { email: { equals: identifier, mode: "insensitive" } },
              { username: { equals: identifier, mode: "insensitive" } },
            ],
          },
        });

        if (!user || !user.passwordHash) {
          throw new Error("Credenciais inválidas. Verifique os dados digitados.");
        }

        // 2. Validação de banimento e blacklist
        if (user.isBanned) {
          throw new Error(`Esta conta foi suspensa: ${user.banReason || "Violação dos Termos de Uso"}.`);
        }

        const isBlacklisted = await prisma.blacklist.findFirst({
          where: {
            OR: [
              { value: user.email },
              { value: user.username },
            ],
          },
        });

        if (isBlacklisted) {
          throw new Error("Acesso bloqueado por restrição administrativa.");
        }

        // 3. Comparação de Hash
        const isPasswordValid = await bcrypt.compare(credentials.password, user.passwordHash);

        if (!isPasswordValid) {
          throw new Error("Credenciais inválidas. Verifique os dados digitados.");
        }

        // 4. Atualiza último login
        await prisma.user.update({
          where: { id: user.id },
          data: {
            lastLoginAt: new Date(),
          },
        });

        return {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          isBanned: user.isBanned,
          discordId: user.discordId,
          isDiscordVerified: user.isDiscordVerified,
          avatarUrl: user.avatarUrl,
        };
      },
    }),
  ],

  callbacks: {
    async signIn() {
      return true;
    },

    async jwt({ token, user, trigger, session }) {
      // Login inicial
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.fullName = user.fullName;
        token.role = user.role;
        token.isBanned = user.isBanned;
        token.discordId = user.discordId;
        token.isDiscordVerified = user.isDiscordVerified;
        token.avatarUrl = user.avatarUrl;
      }

      // Permite atualizar a sessão em tempo real se solicitado via update()
      if (trigger === "update" && session) {
        token = { ...token, ...session.user };
      }

      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
        session.user.fullName = token.fullName as string;
        session.user.role = token.role as Role;
        session.user.isBanned = token.isBanned as boolean;
        session.user.discordId = token.discordId as string | null;
        session.user.isDiscordVerified = token.isDiscordVerified as boolean;
        session.user.avatarUrl = token.avatarUrl as string | null;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || "substitua_por_uma_chave_secreta_forte_32_bytes",
};
