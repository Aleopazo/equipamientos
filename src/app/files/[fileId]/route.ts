import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

type RouteParams = Promise<{
  fileId: string;
}>;

export async function GET(_: NextRequest, { params }: { params: RouteParams }) {
  const { fileId } = await params;

  const file = await prisma.equipmentFile.findUnique({
    where: { id: fileId },
  });

  if (!file) {
    return NextResponse.json({ message: "Archivo no encontrado" }, { status: 404 });
  }

  const url = new URL(file.storedPath, "file://");
  return NextResponse.redirect(url.href);
}

