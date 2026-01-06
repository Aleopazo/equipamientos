import { mkdir, writeFile, stat, rm } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { StorageDriver } from "@prisma/client";

const DEFAULT_BASE_PATH = process.env.FILE_STORAGE_PATH ?? "./storage/files";

type ObjectStorageConfig = {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
};

function readObjectStorageConfig(): ObjectStorageConfig | null {
  const endpoint = process.env.FILE_STORAGE_ENDPOINT_URL;
  const bucket = process.env.FILE_STORAGE_BUCKET_NAME;
  const accessKeyId = process.env.FILE_STORAGE_ACCESS_KEY_ID;
  const secretAccessKey = process.env.FILE_STORAGE_SECRET_ACCESS_KEY;

  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    return null;
  }

  return {
    endpoint,
    bucket,
    region: process.env.FILE_STORAGE_REGION ?? "auto",
    accessKeyId,
    secretAccessKey,
  };
}

function resolveDriver(): StorageDriver {
  const configured = process.env.FILE_STORAGE_DRIVER?.toUpperCase();

  if (configured === "DATABASE") {
    return StorageDriver.DATABASE;
  }
  if (configured === "FILESYSTEM" || configured === "FILE_SYSTEM") {
    return StorageDriver.FILE_SYSTEM;
  }
  if (configured === "OBJECT_STORAGE" || configured === "BUCKET" || configured === "S3") {
    return StorageDriver.OBJECT_STORAGE;
  }

  const objectStorageConfig = readObjectStorageConfig();
  if (objectStorageConfig) {
    return StorageDriver.OBJECT_STORAGE;
  }

  if (
    process.env.RAILWAY_ENVIRONMENT_NAME ||
    process.env.RAILWAY_STATIC_URL ||
    process.env.RAILWAY_PROJECT_ID
  ) {
    return StorageDriver.DATABASE;
  }

  return StorageDriver.FILE_SYSTEM;
}

let cachedDriver: StorageDriver | null = null;

function getDriver(): StorageDriver {
  if (cachedDriver === null) {
    cachedDriver = resolveDriver();
  }
  return cachedDriver;
}

let s3Client: S3Client | null = null;

function ensureObjectStorageConfig(): ObjectStorageConfig {
  const config = readObjectStorageConfig();
  if (!config) {
    throw new Error(
      "El almacenamiento tipo bucket no está configurado correctamente. Revisa las variables FILE_STORAGE_ENDPOINT_URL, FILE_STORAGE_BUCKET_NAME, FILE_STORAGE_ACCESS_KEY_ID y FILE_STORAGE_SECRET_ACCESS_KEY.",
    );
  }
  return config;
}

function getS3Client(): S3Client {
  if (!s3Client) {
    const config = ensureObjectStorageConfig();
    s3Client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }
  return s3Client;
}

async function ensureDir(path: string) {
  try {
    await mkdir(path, { recursive: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
      throw error;
    }
  }
}

export interface StoredFileResult {
  storedPath: string | null;
  fileName: string;
  size: number;
  mimeType: string;
  storageType: StorageDriver;
  data?: Buffer;
}

export function getActiveStorageDriver() {
  return getDriver();
}

export async function saveFileToStorage(
  equipmentId: string,
  file: File,
  filename?: string,
): Promise<StoredFileResult> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const safeName = filename ? filename.replace(/\s+/g, "_") : file.name.replace(/\s+/g, "_");
  const uniqueName = `${Date.now()}-${randomUUID()}-${safeName}`;
  const mimeType = file.type ?? "application/octet-stream";

  const driver = getDriver();

  if (driver === StorageDriver.DATABASE) {
    return {
      storedPath: null,
      fileName: safeName,
      size: buffer.byteLength,
      mimeType,
      storageType: StorageDriver.DATABASE,
      data: buffer,
    };
  }

  if (driver === StorageDriver.OBJECT_STORAGE) {
    return saveToObjectStorage({
      equipmentId,
      buffer,
      mimeType,
      safeName,
      uniqueName,
    });
  }

  const targetDir = join(DEFAULT_BASE_PATH, equipmentId);
  const targetPath = join(targetDir, uniqueName);

  await ensureDir(targetDir);
  await writeFile(targetPath, buffer);

  return {
    storedPath: targetPath,
    fileName: safeName,
    size: buffer.byteLength,
    mimeType,
    storageType: StorageDriver.FILE_SYSTEM,
  };
}

async function saveToObjectStorage(options: {
  equipmentId: string;
  buffer: Buffer;
  uniqueName: string;
  safeName: string;
  mimeType: string;
}): Promise<StoredFileResult> {
  const config = ensureObjectStorageConfig();
  const client = getS3Client();
  const key = `${options.equipmentId}/${options.uniqueName}`;

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: options.buffer,
      ContentType: options.mimeType,
    }),
  );

  const storedPath = new URL(`${config.bucket}/${key}`, ensureTrailingSlash(config.endpoint)).toString();

  return {
    storedPath,
    fileName: options.safeName,
    size: options.buffer.byteLength,
    mimeType: options.mimeType,
    storageType: StorageDriver.OBJECT_STORAGE,
  };
}

export async function deleteFileFromStorage(options: {
  storedPath?: string | null;
  storageType?: StorageDriver | null;
}) {
  const storageType = options.storageType ?? getDriver();
  const storedPath = options.storedPath;

  if (storageType === StorageDriver.OBJECT_STORAGE) {
    await deleteFromObjectStorage(storedPath);
    return;
  }

  if (storageType !== StorageDriver.FILE_SYSTEM || !storedPath) {
    return;
  }

  try {
    await stat(storedPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return;
    }
    throw error;
  }

  await rm(storedPath, { force: true });
}

async function deleteFromObjectStorage(storedPath?: string | null) {
  if (!storedPath) {
    return;
  }

  const config = ensureObjectStorageConfig();
  const key = extractObjectKey(storedPath, config.bucket);
  if (!key) {
    return;
  }

  try {
    await getS3Client().send(
      new DeleteObjectCommand({
        Bucket: config.bucket,
        Key: key,
      }),
    );
  } catch (error) {
    if ((error as { name?: string }).name === "NoSuchKey") {
      return;
    }
    throw error;
  }
}

export async function getSignedObjectStorageUrl(
  storedPath: string,
  options: { expiresInSeconds?: number } = {},
) {
  const config = ensureObjectStorageConfig();
  const key = extractObjectKey(storedPath, config.bucket);
  if (!key) {
    throw new Error("No se pudo resolver la clave del objeto almacenado en el bucket.");
  }

  const command = new GetObjectCommand({
    Bucket: config.bucket,
    Key: key,
  });

  try {
    return await getSignedUrl(getS3Client(), command, {
      expiresIn: options.expiresInSeconds ?? 120,
    });
  } catch (error) {
    console.error("[storage] No fue posible generar la URL firmada", {
      storedPath,
      bucket: config.bucket,
      endpoint: config.endpoint,
      error,
    });
    throw error;
  }
}

function extractObjectKey(storedPath: string, bucket: string): string | null {
  if (!storedPath) {
    return null;
  }

  try {
    const url = new URL(storedPath);
    const pathname = url.pathname.startsWith("/") ? url.pathname.slice(1) : url.pathname;
    if (pathname.startsWith(`${bucket}/`)) {
      return pathname.slice(bucket.length + 1);
    }
    return pathname;
  } catch {
    let value = storedPath;
    if (value.startsWith("s3://")) {
      value = value.slice("s3://".length);
    }
    if (value.startsWith(`${bucket}/`)) {
      return value.slice(bucket.length + 1);
    }
    if (value.startsWith("/")) {
      return value.slice(1);
    }
    return value;
  }
}

function ensureTrailingSlash(value: string) {
  return value.endsWith("/") ? value : `${value}/`;
}

