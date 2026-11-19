import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const licenses = await prisma.licenseKey.findMany({
      where: { userId: session.user.id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            category: true,
            images: true,
            downloadFileUrl: true,
            status: true,
          },
        },
        variant: {
          select: {
            id: true,
            name: true,
            durationValue: true,
            durationType: true,
            priceCents: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const now = new Date();

    const formatted = licenses.map((lic) => {
      let isExpired = false;
      let expiresFormatted = "Não ativado";

      if (lic.expiresAt) {
        if (lic.expiresAt < now) {
          isExpired = true;
          expiresFormatted = "Expirado";
        } else {
          expiresFormatted = lic.expiresAt.toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });
        }
      }

      return {
        id: lic.id,
        key: lic.key,
        status: isExpired && lic.status === "ACTIVE" ? "EXPIRED" : lic.status,
        productName: lic.product.name,
        productSlug: lic.product.slug,
        category: lic.product.category,
        productImage: lic.product.images[0] || null,
        productStatus: lic.product.status,
        downloadUrl: lic.product.downloadFileUrl,
        variantName: lic.variant.name,
        activatedAt: lic.activatedAt,
        expiresAt: lic.expiresAt,
        expiresFormatted,
        hwid: lic.hwid ? `${lic.hwid.slice(0, 8)}...${lic.hwid.slice(-6)}` : null,
        hasHwid: Boolean(lic.hwid),
        lastHwidResetAt: lic.lastHwidResetAt,
        totalFrozenSeconds: lic.totalFrozenSeconds,
      };
    });

    return NextResponse.json({ success: true, licenses: formatted });
  } catch (error: any) {
    console.error("[GET_CLIENT_LICENSES_ERROR]", error);
    return NextResponse.json({ error: "Erro ao buscar licenças do cliente." }, { status: 500 });
  }
}
