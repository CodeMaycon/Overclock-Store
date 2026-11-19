import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { KeyStatus, BlacklistType } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { key, hwid } = body;

    if (!key || !hwid) {
      return NextResponse.json(
        { error: "DADOS_INCOMPLETOS", message: "Key e HWID são obrigatórios." },
        { status: 400 }
      );
    }

    const cleanKey = String(key).trim().toUpperCase();
    const cleanHwid = String(hwid).trim();

    const license = await prisma.licenseKey.findUnique({
      where: { key: cleanKey },
      include: { product: true, user: true },
    });

    if (!license) {
      return NextResponse.json(
        { error: "CHAVE_INEXISTENTE", message: "Licença não encontrada." },
        { status: 404 }
      );
    }

    // Validações de integridade
    if (license.status === KeyStatus.REVOKED) {
      return NextResponse.json({ error: "REVOKED", active: false }, { status: 403 });
    }

    if (license.status === KeyStatus.FROZEN) {
      return NextResponse.json({ error: "FROZEN", active: false }, { status: 423 });
    }

    if (license.hwid && license.hwid !== cleanHwid) {
      return NextResponse.json({ error: "HWID_MISMATCH", active: false }, { status: 403 });
    }

    const now = new Date();
    if (license.expiresAt && license.expiresAt.getTime() < now.getTime()) {
      await prisma.licenseKey.update({
        where: { id: license.id },
        data: { status: KeyStatus.EXPIRED },
      });
      return NextResponse.json({ error: "EXPIRED", active: false }, { status: 403 });
    }

    const remainingSeconds = license.expiresAt
      ? Math.max(0, Math.floor((license.expiresAt.getTime() - now.getTime()) / 1000))
      : -1;

    return NextResponse.json({
      success: true,
      active: true,
      status: license.status,
      remainingSeconds,
      timestamp: now.toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: "HEARTBEAT_FAILED", active: false }, { status: 500 });
  }
}
