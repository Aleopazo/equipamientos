import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

interface Params {
  fileId: string;
}

export async function GET(_: Request, context: { params: Params }) {
  const { fileId } = context.params;

  const file = await prisma.equipmentFile.findUnique({
    where: { id: fileId },
  });

  if (!file) {
    return NextResponse.json({ message: "Archivo no encontrado" }, { status: 404 });
  }

  const url = new URL(file.storedPath, "file://");
  return NextResponse.redirect(url.href);
}

