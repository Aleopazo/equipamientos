import { rm, stat } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it, beforeEach, afterAll } from "vitest";

import { deleteFileFromStorage, saveFileToStorage } from "@/lib/storage";

const TEST_EQUIPMENT_ID = "test-equipment";
const BASE_PATH = process.env.FILE_STORAGE_PATH ?? "./storage/files";
const TEST_DIR = path.join(BASE_PATH, TEST_EQUIPMENT_ID);

async function cleanup() {
  await rm(TEST_DIR, { recursive: true, force: true });
}

describe("storage utilities", () => {
  beforeEach(async () => {
    await cleanup();
  });

  afterAll(async () => {
    await cleanup();
  });

  it("guarda un archivo en disco y devuelve metadatos", async () => {
    const content = new TextEncoder().encode("Informe de prueba");
    const file = new File([content], "informe.txt", { type: "text/plain" });

    const result = await saveFileToStorage(TEST_EQUIPMENT_ID, file, "Informe turno AM");

    expect(result.fileName).toBe("Informe_turno_AM");
    expect(result.mimeType).toBe("text/plain");
    expect(result.size).toBe(content.byteLength);
    expect(result.storedPath).toContain(TEST_EQUIPMENT_ID);

    const fileInfo = await stat(result.storedPath);
    expect(fileInfo.isFile()).toBe(true);
    expect(fileInfo.size).toBe(content.byteLength);
  });

  it("elimina un archivo existente sin errores", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "diagnostico.pdf", {
      type: "application/pdf",
    });

    const result = await saveFileToStorage(TEST_EQUIPMENT_ID, file);
    const fileInfo = await stat(result.storedPath);
    expect(fileInfo.isFile()).toBe(true);

    await deleteFileFromStorage(result.storedPath);

    await expect(stat(result.storedPath)).rejects.toMatchObject({
      code: "ENOENT",
    });
  });
});

