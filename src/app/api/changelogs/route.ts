import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const changelogs = await prisma.changelog.findMany({
      where: { isPublished: true },
      include: {
        product: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
      orderBy: { releaseDate: "desc" },
    });

    const formatted = changelogs.map((c) => ({
      id: c.id,
      version: c.version,
      title: c.title,
      content: c.contentMarkdown,
      productName: c.product.name,
      productSlug: c.product.slug,
      date: c.releaseDate.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
    }));

    return NextResponse.json({ success: true, changelogs: formatted });
  } catch (error) {
    console.error("[GET_CHANGELOGS_ERROR]", error);
    return NextResponse.json({ success: true, changelogs: [] });
  }
}
