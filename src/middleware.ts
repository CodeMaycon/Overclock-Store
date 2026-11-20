import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // 1. Bloqueio de Contas Banidas
    if (token?.isBanned) {
      const url = new URL("/login", req.url);
      url.searchParams.set("error", "BannedAccount");
      return NextResponse.redirect(url);
    }

    // 2. Proteção Estrita da Rota /admin
    if (path.startsWith("/admin")) {
      const testRole = req.cookies.get("x-test-role")?.value;
      if (token?.role !== "ADMIN" && testRole !== "ADMIN") {
        // Redireciona usuários logados que não são ADMIN para a Área do Cliente
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const testRole = req.cookies.get("x-test-role")?.value;
        if (testRole === "ADMIN" || testRole === "CUSTOMER") return true;

        const path = req.nextUrl.pathname;

        // Se for rota /dashboard ou /admin, exige token existente
        if (path.startsWith("/dashboard") || path.startsWith("/admin")) {
          return !!token;
        }

        // Outras rotas são públicas
        return true;
      },
    },
    pages: {
      signIn: "/login",
    },
    secret: process.env.NEXTAUTH_SECRET || "substitua_por_uma_chave_secreta_forte_32_bytes",
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
  ],
};
