import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { KeyStatus, BlacklistType, ActorType } from "@prisma/client";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { key, hwid, productSlug, version } = body;

    // 1. Validação básica de entrada
    if (!key || !hwid) {
      return NextResponse.json(
        { error: "DADOS_INCOMPLETOS", message: "A chave de licença (key) e o HWID são obrigatórios." },
        { status: 400 }
      );
    }

    const cleanKey = String(key).trim().toUpperCase();
    const cleanHwid = String(hwid).trim();

    // 2. Busca chave no banco com produto, variante e usuário
    const license = await prisma.licenseKey.findUnique({
      where: { key: cleanKey },
      include: {
        product: true,
        variant: true,
        user: true,
      },
    });

    if (!license) {
      return NextResponse.json(
        { error: "CHAVE_INEXISTENTE", message: "Licença não encontrada no cluster da Overclock Store." },
        { status: 404 }
      );
    }

    // 3. Valida compatibilidade de produto
    if (productSlug && license.product.slug.toLowerCase() !== String(productSlug).trim().toLowerCase()) {
      return NextResponse.json(
        {
          error: "PRODUTO_INVALIDO",
          message: `Esta licença é exclusiva para o produto "${license.product.name}" e não para "${productSlug}".`,
        },
        { status: 400 }
      );
    }

    // 4. Checa status da chave
    if (license.status === KeyStatus.REVOKED) {
      return NextResponse.json(
        { error: "LICENCA_REVOGADA", message: "Esta licença foi revogada por infração aos Termos de Uso." },
        { status: 403 }
      );
    }

    if (license.status === KeyStatus.FROZEN) {
      return NextResponse.json(
        {
          error: "LICENCA_CONGELADA",
          message: "Software em manutenção preventiva para segurança e integridade de driver. O tempo da sua licença está pausado (Freeze Time ativado).",
        },
        { status: 423 }
      );
    }

    // 5. Checa Blacklist (HWID ou Usuário)
    const blacklistedHwid = await prisma.blacklist.findFirst({
      where: {
        type: BlacklistType.HWID,
        value: cleanHwid,
      },
    });

    if (blacklistedHwid) {
      return NextResponse.json(
        { error: "HWID_BLACKLISTED", message: "Este hardware está bloqueado administrativamente." },
        { status: 403 }
      );
    }

    if (license.user) {
      if (license.user.isBanned) {
        return NextResponse.json(
          { error: "USUARIO_BLOQUEADO", message: `Conta suspensa: ${license.user.banReason || "Violação de regras"}.` },
          { status: 403 }
        );
      }

      const blacklistedUser = await prisma.blacklist.findFirst({
        where: {
          OR: [
            { type: BlacklistType.EMAIL, value: license.user.email },
            { type: BlacklistType.USERNAME, value: license.user.username },
            ...(license.user.discordId ? [{ type: BlacklistType.DISCORD_ID, value: license.user.discordId }] : []),
          ],
        },
      });

      if (blacklistedUser) {
        return NextResponse.json(
          { error: "USUARIO_BLOQUEADO", message: "Acesso restrito por diretiva de segurança administrativa." },
          { status: 403 }
        );
      }
    }

    const now = new Date();

    // 6. PRIMEIRO LOGIN: Ativação da chave (NOT_ACTIVATED ou UNASSIGNED -> ACTIVE)
    if (license.status === KeyStatus.NOT_ACTIVATED || license.status === KeyStatus.UNASSIGNED) {
      const isLifetime =
        license.variant.durationValue === 0 ||
        license.variant.name.toLowerCase().includes("life") ||
        license.variant.durationValue >= 800000;

      let expiresAt: Date | null = null;
      if (!isLifetime) {
        const hours = license.variant.durationValue || 24;
        expiresAt = new Date(now.getTime() + hours * 3600 * 1000);
      }

      const activatedLicense = await prisma.licenseKey.update({
        where: { id: license.id },
        data: {
          status: KeyStatus.ACTIVE,
          hwid: cleanHwid,
          activatedAt: now,
          expiresAt: expiresAt,
        },
      });

      // Registra evento de ativação no AuditLog
      await prisma.auditLog.create({
        data: {
          userId: license.userId,
          actorType: ActorType.LOADER,
          action: "LOADER_KEY_ACTIVATED",
          entityType: "LicenseKey",
          entityId: license.id,
          metadata: {
            hwid: cleanHwid,
            version: version || "unknown",
            isLifetime,
            expiresAt,
          },
        },
      });

      // Gera Token de Sessão Assinado
      const sessionToken = crypto
        .createHmac("sha256", process.env.NEXTAUTH_SECRET || "overclock_secret_2026")
        .update(`${activatedLicense.id}:${cleanHwid}:${now.getTime()}`)
        .digest("hex");

      const remainingSeconds = expiresAt ? Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000)) : -1;

      return NextResponse.json({
        success: true,
        valid: true,
        isFirstActivation: true,
        sessionToken,
        license: {
          key: activatedLicense.key,
          status: KeyStatus.ACTIVE,
          hwid: activatedLicense.hwid,
          isLifetime,
          activatedAt: activatedLicense.activatedAt,
          expiresAt: activatedLicense.expiresAt,
          remainingSeconds,
        },
        product: {
          name: license.product.name,
          slug: license.product.slug,
          version: license.product.currentVersion,
        },
        serverTime: now.toISOString(),
      });
    }

    // 7. LOGINS SEGUINTES (ACTIVE)
    if (license.status === KeyStatus.ACTIVE) {
      // Checa expiração de tempo
      if (license.expiresAt && license.expiresAt.getTime() < now.getTime()) {
        await prisma.licenseKey.update({
          where: { id: license.id },
          data: { status: KeyStatus.EXPIRED },
        });

        return NextResponse.json(
          { error: "LICENCA_EXPIRADA", message: "Esta licença expirou. Renove seu acesso no site." },
          { status: 403 }
        );
      }

      // Validação Estrita de HWID Lock (travamento 1:1 de hardware)
      if (license.hwid && license.hwid !== cleanHwid) {
        // Registra tentativa de violação de HWID no AuditLog
        await prisma.auditLog.create({
          data: {
            userId: license.userId,
            actorType: ActorType.LOADER,
            action: "LOADER_HWID_MISMATCH_BLOCKED",
            entityType: "LicenseKey",
            entityId: license.id,
            metadata: {
              lockedHwid: license.hwid,
              attemptedHwid: cleanHwid,
              productSlug: license.product.slug,
            },
          },
        });

        return NextResponse.json(
          {
            error: "HWID_MISMATCH",
            message: "HWID incompatível. Este software está travado em outro computador. Solicite o reset de HWID na sua Área do Cliente.",
            lockedHwid: license.hwid.slice(0, 8) + "...",
          },
          { status: 403 }
        );
      }

      // Se a chave não tinha HWID registrado por algum motivo, trava agora
      if (!license.hwid) {
        await prisma.licenseKey.update({
          where: { id: license.id },
          data: { hwid: cleanHwid },
        });
      }

      const isLifetime = !license.expiresAt;
      const remainingSeconds = license.expiresAt
        ? Math.max(0, Math.floor((license.expiresAt.getTime() - now.getTime()) / 1000))
        : -1;

      const sessionToken = crypto
        .createHmac("sha256", process.env.NEXTAUTH_SECRET || "overclock_secret_2026")
        .update(`${license.id}:${cleanHwid}:${now.getTime()}`)
        .digest("hex");

      return NextResponse.json({
        success: true,
        valid: true,
        isFirstActivation: false,
        sessionToken,
        license: {
          key: license.key,
          status: KeyStatus.ACTIVE,
          hwid: license.hwid || cleanHwid,
          isLifetime,
          activatedAt: license.activatedAt,
          expiresAt: license.expiresAt,
          remainingSeconds,
        },
        product: {
          name: license.product.name,
          slug: license.product.slug,
          version: license.product.currentVersion,
        },
        serverTime: now.toISOString(),
      });
    }

    return NextResponse.json(
      { error: "STATUS_INVALIDO", message: `Status da licença: ${license.status}` },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("[LOADER_AUTH_ERROR]", error);
    return NextResponse.json(
      { error: "ERRO_INTERNO", message: "Falha de comunicação com o cluster de validação." },
      { status: 500 }
    );
  }
}
