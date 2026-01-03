import { mkdir, writeFile, stat, rm } from "node:fs/promises";
import { join, dirname } from "node:path";
import { randomUUID } from "node:crypto";

const BASE_PATH = process.env.FILE_STORAGE_PATH ?? "./storage/files";

async function ensureDir(path: string) {
  try {
    await mkdir(path, { recursive: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
      throw error;
    }
  }
}

export async function saveFileToStorage(
  equipmentId: string,
  file: File,
  filename?: string,
) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const safeName = filename ? filename.replace(/\s+/g, "_") : file.name.replace(/\s+/g, "_");
  const uniqueName = `${Date.now()}-${randomUUID()}-${safeName}`;
  const targetDir = join(BASE_PATH, equipmentId);
  const targetPath = join(targetDir, uniqueName);

  await ensureDir(targetDir);
  await writeFile(targetPath, buffer);

  return {
    storedPath: targetPath,
    fileName: safeName,
    size: buffer.byteLength,
    mimeType: file.type ?? "application/octet-stream",
  };
}

export async function deleteFileFromStorage(storedPath: string) {
  try {
    await stat(storedPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return;
    }
    throw error;
  }

  await rm(storedPath, { force: true });
  const parent = dirname(storedPath);
  // No removemos directorio vacío para evitar operaciones innecesarias en producción.
  return parent;
}

