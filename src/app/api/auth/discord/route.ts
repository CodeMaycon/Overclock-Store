import { NextRequest, NextResponse } from "next/server";
import { requireClientSession } from "@/lib/client-auth";
import { getDiscordOAuthUrl } from "@/lib/discord";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  const host = req.headers.get("host") || "localhost:3001";
  const protocol = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || `${protocol}://${host}`;

  const auth = await requireClientSession();
  if (!auth.authorized) {
    const loginUrl = new URL("/login", baseUrl);
    loginUrl.searchParams.set("callbackUrl", "/dashboard");
    return NextResponse.redirect(loginUrl);
  }

  const state = crypto.randomBytes(16).toString("hex");
  const redirectUri = `${baseUrl}/api/auth/discord/callback`;
  const authUrl = getDiscordOAuthUrl(redirectUri, state);

  const response = NextResponse.redirect(authUrl);
  response.cookies.set("discord_oauth_state", state, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600, // 10 minutos
  });

  return response;
}
