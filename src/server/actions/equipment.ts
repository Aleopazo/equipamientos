"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

const positionSchema = z
  .object({
    x: z.number(),
    y: z.number(),
  })
  .optional();

const equipmentFields = {
  name: z.string().min(1, "El nombre es obligatorio"),
  code: z.string().min(1, "El código interno es obligatorio"),
  category: z.string().min(1, "La categoría es obligatoria"),
  description: z.string().optional(),
  notes: z.string().optional(),
  position: positionSchema,
};

const createEquipmentSchema = z.object({
  ...equipmentFields,
  photo: z.instanceof(File).optional(),
});

export async function createEquipment(input: z.infer<typeof createEquipmentSchema>) {
  const data = createEquipmentSchema.parse(input);

  const { photo, position, ...payload } = data;

  const equipment = await prisma.equipment.create({
    data: {
      ...payload,
      position: position ?? undefined,
    },
  });

  if (photo && photo.size > 0) {
    const { saveFileToStorage } = await import("@/lib/storage");
    const stored = await saveFileToStorage(equipment.id, photo, `${equipment.code}-foto-principal`);

    const photoRecord = await prisma.equipmentFile.create({
      data: {
        equipmentId: equipment.id,
        label: "Foto principal",
        description: "Imagen de referencia del equipo",
        uploadedBy: "Sistema",
        isPrimary: true,
        ...stored,
      },
    });

    await prisma.equipment.update({
      where: { id: equipment.id },
      data: { primaryPhotoId: photoRecord.id },
    });
  }

  revalidatePath("/");
  return equipment;
}

const updateEquipmentSchema = z
  .object({
    id: z.string().cuid(),
    photo: z.instanceof(File).optional(),
  })
  .merge(z.object(equipmentFields).partial());

export async function updateEquipment(input: z.infer<typeof updateEquipmentSchema>) {
  const data = updateEquipmentSchema.parse(input);

  const { id, photo, position, ...payload } = data;

  const existing = await prisma.equipment.findUnique({
    where: { id },
    include: {
      primaryPhoto: true,
    },
  });

  if (!existing) {
    throw new Error("El equipo que intentas actualizar no existe.");
  }

  let newPrimaryPhotoId: string | undefined;
  let oldPrimary: { id: string; storedPath: string } | null = null;

  if (photo && photo.size > 0) {
    const { saveFileToStorage, deleteFileFromStorage } = await import("@/lib/storage");
    const stored = await saveFileToStorage(id, photo, `${payload.code ?? existing.code}-foto`);

    const photoRecord = await prisma.equipmentFile.create({
      data: {
        equipmentId: id,
        label: "Foto principal",
        description: "Imagen de referencia del equipo",
        uploadedBy: "Sistema",
        isPrimary: true,
        ...stored,
      },
    });

    newPrimaryPhotoId = photoRecord.id;

    if (existing.primaryPhotoId) {
      oldPrimary = {
        id: existing.primaryPhotoId,
        storedPath: existing.primaryPhoto?.storedPath ?? "",
      };
    }

    if (oldPrimary) {
      await prisma.equipmentFile.update({
        where: { id: oldPrimary.id },
        data: { isPrimary: false },
      });
    }

    queueMicrotask(async () => {
      if (oldPrimary?.storedPath) {
        await deleteFileFromStorage(oldPrimary.storedPath);
      }
      if (oldPrimary?.id) {
        await prisma.equipmentFile.delete({ where: { id: oldPrimary.id } }).catch(() => {});
      }
    });
  }

  const equipment = await prisma.equipment.update({
    where: { id },
    data: {
      ...payload,
      position: position ?? undefined,
      primaryPhotoId: newPrimaryPhotoId ?? undefined,
    },
  });

  revalidatePath("/");
  return equipment;
}

const deleteEquipmentSchema = z.object({
  id: z.string().cuid(),
});

export async function deleteEquipment(input: z.infer<typeof deleteEquipmentSchema>) {
  const data = deleteEquipmentSchema.parse(input);

  await prisma.$transaction(async (tx) => {
    const files = await tx.equipmentFile.findMany({
      where: { equipmentId: data.id },
    });

    await tx.equipmentFile.deleteMany({
      where: { equipmentId: data.id },
    });
    await tx.ticket.deleteMany({
      where: { equipmentId: data.id },
    });
    await tx.equipmentLog.deleteMany({
      where: { equipmentId: data.id },
    });
    await tx.equipment.delete({
      where: { id: data.id },
    });

    // Eliminamos físicamente los archivos tras limpiar la base de datos.
    // La eliminación física se maneja de forma best-effort desde el cliente de almacenamiento.
    for (const file of files) {
      queueMicrotask(async () => {
        const { deleteFileFromStorage } = await import("@/lib/storage");
        await deleteFileFromStorage(file.storedPath);
      });
    }
  });

  revalidatePath("/");
}

const assignStateSchema = z.object({
  equipmentId: z.string().cuid(),
  stateId: z.string().cuid(),
  message: z.string().optional(),
  recordedBy: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function assignEquipmentState(input: z.infer<typeof assignStateSchema>) {
  const data = assignStateSchema.parse(input);

  const state = await prisma.equipmentState.findUnique({
    where: { id: data.stateId },
  });
  if (!state) {
    throw new Error("El estado seleccionado no existe");
  }

  const result = await prisma.$transaction(async (tx) => {
    const equipment = await tx.equipment.update({
      where: { id: data.equipmentId },
      data: {
        currentStateId: data.stateId,
      },
    });

    const log = await tx.equipmentLog.create({
      data: {
        equipmentId: data.equipmentId,
        stateId: data.stateId,
        message: data.message ?? `Estado actualizado a ${state.name}`,
        metadata: data.metadata
          ? (JSON.parse(JSON.stringify(data.metadata)) as Prisma.InputJsonValue)
          : undefined,
        recordedBy: data.recordedBy,
      },
    });

    return { equipment, log };
  });

  revalidatePath("/");
  return result;
}

