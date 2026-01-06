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

vi.mock("@/lib/storage", () => {
  return {
    getSignedObjectStorageUrl: vi.fn(),
  };
});

const { prisma } = await import("@/lib/prisma");
const { getSignedObjectStorageUrl } = await import("@/lib/storage");
const { GET } = await import("@/app/files/[fileId]/route");

describe("GET /files/[fileId] handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("redirige a la URL firmada cuando el archivo está en object storage", async () => {
    const signedUrl = "https://storage.railway.app/preserved-case-7pxx-i5thk/archivo.png?token=abc";

    (prisma.equipmentFile.findUnique as unknown as vi.Mock).mockResolvedValue({
      id: "file-1",
      storageType: "OBJECT_STORAGE",
      storedPath: "https://storage.railway.app/preserved-case-7pxx-i5thk/archivo.png",
      fileName: "archivo.png",
      mimeType: "image/png",
      size: 10,
      data: null,
    });

    (getSignedObjectStorageUrl as unknown as vi.Mock).mockResolvedValue(signedUrl);

    const response = await GET(new NextRequest("http://example.com"), {
      params: Promise.resolve({ fileId: "file-1" }),
    });

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(signedUrl);
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

    (getSignedObjectStorageUrl as unknown as vi.Mock).mockRejectedValue(
      new Error("fallo firma"),
    );

    const response = await GET(new NextRequest("http://example.com"), {
      params: Promise.resolve({ fileId: "file-2" }),
    });

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(storedPath);
  });
});

