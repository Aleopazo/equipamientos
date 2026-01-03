"use server";

import { TicketStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export async function getEquipmentOverview() {
  return prisma.equipment.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
    include: {
      currentState: true,
      primaryPhoto: true,
      tickets: {
        where: {
          status: { not: TicketStatus.FINALIZADO },
        },
        orderBy: {
          openedAt: "desc",
        },
      },
    },
  });
}

export async function getEquipmentDetail(equipmentId: string) {
  return prisma.equipment.findUnique({
    where: { id: equipmentId },
    include: {
      currentState: true,
      primaryPhoto: true,
      files: {
        orderBy: { uploadedAt: "desc" },
      },
      tickets: {
        orderBy: { openedAt: "desc" },
        include: {
          comments: {
            orderBy: { createdAt: "desc" },
          },
        },
      },
      logs: {
        orderBy: { recordedAt: "desc" },
        include: {
          state: true,
        },
        take: 25,
      },
    },
  });
}

export async function listStates() {
  return prisma.equipmentState.findMany({
    orderBy: [
      { level: "desc" },
      { name: "asc" },
    ],
  });
}

