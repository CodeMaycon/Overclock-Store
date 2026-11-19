import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";
import { BlacklistType, ActorType } from "@prisma/client";

export async function GET() {
  const auth = await requireAdminSession();
  if (!auth.authorized) return auth.response!;

  try {
    const list = await prisma.blacklist.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, blacklist: list });
  } catch (error: any) {
    return NextResponse.json({ error: "Erro ao buscar registros de blacklist." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminSession();
  if (!auth.authorized) return auth.response!;

  try {
    const body = await req.json();
    const { type, value, reason } = body;

    if (!type || !value) {
      return NextResponse.json({ error: "Tipo e valor são obrigatórios." }, { status: 400 });
    }

    const cleanValue = String(value).trim();
    const validTypes = ["EMAIL", "IP", "HWID", "DISCORD_ID", "USERNAME"];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: "Tipo de restrição inválido." }, { status: 400 });
    }

    const created = await prisma.blacklist.upsert({
      where: {
        type_value: {
          type: type as BlacklistType,
          value: cleanValue,
        },
      },
      update: {
        reason: reason || "Bloqueio preventivo pelo painel administrativo.",
        createdBy: auth.session!.user.username,
      },
      create: {
        type: type as BlacklistType,
        value: cleanValue,
        reason: reason || "Bloqueio preventivo pelo painel administrativo.",
        createdBy: auth.session!.user.username,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: auth.session!.user.id,
        actorType: ActorType.ADMIN,
        action: "BLACKLIST_ENTRY_ADDED",
        entityType: "Blacklist",
        entityId: created.id,
        metadata: { type, value: cleanValue, reason },
      },
    });

    return NextResponse.json({ success: true, item: created });
  } catch (error: any) {
    console.error("[ADMIN_BLACKLIST_POST_ERROR]", error);
    return NextResponse.json({ error: "Erro ao adicionar restrição na blacklist." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdminSession();
  if (!auth.authorized) return auth.response!;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID obrigatório." }, { status: 400 });
    }

    const deleted = await prisma.blacklist.delete({
      where: { id },
    });

    await prisma.auditLog.create({
      data: {
        userId: auth.session!.user.id,
        actorType: ActorType.ADMIN,
        action: "BLACKLIST_ENTRY_REMOVED",
        entityType: "Blacklist",
        entityId: id,
        metadata: { type: deleted.type, value: deleted.value },
      },
    });

    return NextResponse.json({ success: true, message: "Restrição removida com sucesso." });
  } catch (error: any) {
    return NextResponse.json({ error: "Erro ao remover restrição da blacklist." }, { status: 500 });
  }
}
