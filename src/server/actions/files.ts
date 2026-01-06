"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { saveFileToStorage, deleteFileFromStorage } from "@/lib/storage";

const uploadSchema = z.object({
  equipmentId: z.string().cuid(),
  label: z.string().min(1, "El nombre del archivo es obligatorio"),
  description: z.string().optional(),
  uploadedBy: z.string().optional(),
  file: z.instanceof(File),
});

export async function uploadEquipmentFile(input: z.infer<typeof uploadSchema>) {
  const data = uploadSchema.parse(input);

  const stored = await saveFileToStorage(
    data.equipmentId,
    data.file,
    data.label,
  );

  const record = await prisma.equipmentFile.create({
    data: {
      equipmentId: data.equipmentId,
      label: data.label,
      description: data.description,
      uploadedBy: data.uploadedBy,
      fileName: stored.fileName,
      size: stored.size,
      mimeType: stored.mimeType,
      storedPath: stored.storedPath,
      storageType: stored.storageType,
      data: stored.data,
    },
  });

  revalidatePath("/");
  return record;
}

const deleteSchema = z.object({
  id: z.string().cuid(),
});

export async function removeEquipmentFile(input: z.infer<typeof deleteSchema>) {
  const data = deleteSchema.parse(input);

  const record = await prisma.equipmentFile.delete({
    where: { id: data.id },
  });

  queueMicrotask(async () => {
    await deleteFileFromStorage({
      storedPath: record.storedPath,
      storageType: record.storageType,
    });
  });

  revalidatePath("/");
  return record;
}

