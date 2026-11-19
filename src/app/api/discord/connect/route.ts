import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DiscordService } from "@/services/discord.service";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const host = req.headers.get("host") || "localhost:3001";
  const protocol = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const appUrl = process.env.NEXTAUTH_URL || `${protocol}://${host}`;

  if (!session || !session.user) {
    const loginUrl = new URL("/login", appUrl);
    loginUrl.searchParams.set("callbackUrl", "/dashboard");
    return NextResponse.redirect(loginUrl);
  }

  const state = crypto.randomBytes(16).toString("hex");
  const redirectUri = `${appUrl}/api/discord/callback`;
  const discordAuthUrl = DiscordService.getAuthorizationUrl(redirectUri, state);

  const response = NextResponse.redirect(discordAuthUrl);
  response.cookies.set("discord_oauth_state", state, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 600, // 10 minutos
    sameSite: "lax",
  });

  return response;
}
