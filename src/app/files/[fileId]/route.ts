import { NextRequest, NextResponse } from "next/server";

import { StorageDriver } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getSignedObjectStorageUrl } from "@/lib/storage";

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

  if (file.storageType === StorageDriver.DATABASE) {
    if (!file.data) {
      return NextResponse.json({ message: "Contenido no disponible" }, { status: 404 });
    }

    const safeName = file.fileName.replace(/"/g, '\\"');
    const binaryView = new Uint8Array(file.data);
    return new NextResponse(binaryView, {
      headers: {
        "Content-Type": file.mimeType ?? "application/octet-stream",
        "Content-Length": file.size.toString(),
        "Content-Disposition": `inline; filename="${safeName}"`,
        "Cache-Control": "public, max-age=60",
      },
    });
  }

  if (!file.storedPath) {
    return NextResponse.json({ message: "Ruta del archivo no disponible" }, { status: 404 });
  }

  if (file.storageType === StorageDriver.OBJECT_STORAGE) {
    try {
      const signedUrl = await getSignedObjectStorageUrl(file.storedPath);
      return NextResponse.redirect(signedUrl);
    } catch (error) {
      console.error("[files.get] Error generando URL firmada del bucket", error);
      return NextResponse.redirect(file.storedPath);
    }
  }

  const url = new URL(file.storedPath, "file://");
  return NextResponse.redirect(url.href);
}

