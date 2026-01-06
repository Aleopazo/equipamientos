import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/prisma", () => {
  return {
    prisma: {
      equipmentFile: {
        findUnique: vi.fn(),
      },
    },
  };
});

vi.mock("@/lib/storage", () => ({
  getSignedObjectStorageUrl: vi.fn(),
  getObjectFromStorage: vi.fn(),
}));

const { prisma } = await import("@/lib/prisma");
const { getSignedObjectStorageUrl, getObjectFromStorage } = await import("@/lib/storage");
const { GET } = await import("@/app/files/[fileId]/route");

describe("GET /files/[fileId] handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("devuelve el contenido del bucket cuando el archivo está en object storage", async () => {
    const bodyText = "contenido";
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(bodyText));
        controller.close();
      },
    });

    (prisma.equipmentFile.findUnique as unknown as vi.Mock).mockResolvedValue({
      id: "file-1",
      storageType: "OBJECT_STORAGE",
      storedPath: "https://storage.railway.app/preserved-case-7pxx-i5thk/archivo.png",
      fileName: "archivo.png",
      mimeType: "image/png",
      size: 10,
      data: null,
    });

    (getObjectFromStorage as unknown as vi.Mock).mockResolvedValue({
      body: stream,
      contentType: "image/png",
      contentLength: 1234,
      etag: "test-etag",
      lastModified: new Date("2024-01-01T00:00:00Z"),
    });

    const response = await GET(new NextRequest("http://example.com"), {
      params: Promise.resolve({ fileId: "file-1" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("content-length")).toBe("1234");
    expect(response.headers.get("etag")).toBe("test-etag");
    expect(response.headers.get("last-modified")).toBe("Mon, 01 Jan 2024 00:00:00 GMT");
    expect(await response.text()).toBe(bodyText);
  });

  it("redirige al storedPath si la firma falla", async () => {
    const storedPath =
      "https://storage.railway.app/preserved-case-7pxx-i5thk/archivo.png";

    (prisma.equipmentFile.findUnique as unknown as vi.Mock).mockResolvedValue({
      id: "file-2",
      storageType: "OBJECT_STORAGE",
      storedPath,
      fileName: "archivo.png",
      mimeType: "image/png",
      size: 10,
      data: null,
    });

    (getObjectFromStorage as unknown as vi.Mock).mockRejectedValue(new Error("fallo stream"));
    (getSignedObjectStorageUrl as unknown as vi.Mock).mockResolvedValue(
      `${storedPath}?token=123`,
    );

    const response = await GET(new NextRequest("http://example.com"), {
      params: Promise.resolve({ fileId: "file-2" }),
    });

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(`${storedPath}?token=123`);
  });
});

