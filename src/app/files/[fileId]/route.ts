import { NextRequest, NextResponse } from "next/server";

import { StorageDriver } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getObjectFromStorage, getSignedObjectStorageUrl } from "@/lib/storage";

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
      const object = await getObjectFromStorage(file.storedPath);
      const headers = new Headers({
        "Content-Type": object.contentType ?? file.mimeType ?? "application/octet-stream",
        "Cache-Control": "private, max-age=60",
        "Content-Disposition": `inline; filename="${file.fileName.replace(/"/g, '\\"')}"`,
      });

      if (object.contentLength != null) {
        headers.set("Content-Length", object.contentLength.toString());
      }
      if (object.etag) {
        headers.set("ETag", object.etag);
      }
      if (object.lastModified) {
        headers.set("Last-Modified", object.lastModified.toUTCString());
      }

      return new NextResponse(object.body, {
        status: 200,
        headers,
      });
    } catch (error) {
      console.error("[files.get] Error obteniendo archivo desde object storage", {
        error,
        fileId,
      });

      try {
        const fallbackUrl = await getSignedObjectStorageUrl(file.storedPath, {
          expiresInSeconds: 60,
        });
        return NextResponse.redirect(fallbackUrl);
      } catch (secondaryError) {
        console.error("[files.get] Fallback de URL firmada también falló", {
          secondaryError,
          fileId,
        });
      }

      return NextResponse.json(
        { message: "No fue posible recuperar el archivo solicitado" },
        { status: 502 },
      );
    }
  }

  const url = new URL(file.storedPath, "file://");
  return NextResponse.redirect(url.href);
}

