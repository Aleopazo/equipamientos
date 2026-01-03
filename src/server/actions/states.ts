"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

const hexColor = /^#([0-9a-fA-F]{3}){1,2}$/;

const stateSchema = z.object({
  name: z.string().min(1, "El nombre del estado es obligatorio"),
  description: z.string().optional(),
  level: z.number().int().min(0).max(10).default(0),
  color: z
    .string()
    .regex(hexColor, "El color debe estar en formato hexadecimal (#RRGGBB)")
    .default("#9CA3AF"),
});

export async function createEquipmentState(input: z.infer<typeof stateSchema>) {
  const data = stateSchema.parse(input);

  const state = await prisma.equipmentState.create({
    data,
  });

  revalidatePath("/");
  return state;
}

const updateStateSchema = stateSchema.partial().extend({
  id: z.string().cuid(),
});

export async function updateEquipmentState(input: z.infer<typeof updateStateSchema>) {
  const { id, ...payload } = updateStateSchema.parse(input);

  const state = await prisma.equipmentState.update({
    where: { id },
    data: payload,
  });

  revalidatePath("/");
  return state;
}

const deleteStateSchema = z.object({
  id: z.string().cuid(),
  fallbackStateId: z.string().cuid().optional(),
});

export async function deleteEquipmentState(input: z.infer<typeof deleteStateSchema>) {
  const data = deleteStateSchema.parse(input);

  await prisma.$transaction(async (tx) => {
    if (data.fallbackStateId) {
      await tx.equipment.updateMany({
        where: {
          currentStateId: data.id,
        },
        data: {
          currentStateId: data.fallbackStateId,
        },
      });

      await tx.equipmentLog.updateMany({
        where: {
          stateId: data.id,
        },
        data: {
          stateId: data.fallbackStateId,
        },
      });
    }

    await tx.equipmentState.delete({
      where: { id: data.id },
    });
  });

  revalidatePath("/");
}

