import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const host = req.headers.get("host") || "localhost:3001";
  const protocol = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const appUrl = process.env.NEXTAUTH_URL || `${protocol}://${host}`;
  return NextResponse.redirect(`${appUrl}/api/auth/discord`);
}
