"use server";

import { TicketStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export async function listCars() {
  return prisma.car.findMany({
    orderBy: [
      { order: "asc" },
      { createdAt: "asc" },
    ],
  });
}

export async function getEquipmentOverviewByCar(carId: string) {
  return prisma.equipment.findMany({
    where: { carId },
    orderBy: [
      { category: "asc" },
      { name: "asc" },
    ],
    include: {
      currentState: true,
      primaryPhoto: true,
      car: true,
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

export async function getEquipmentWithIssues() {
  return prisma.equipment.findMany({
    where: {
      OR: [
        {
          currentState: {
            level: {
              lt: 2,
            },
          },
        },
        {
          tickets: {
            some: {
              status: { not: TicketStatus.FINALIZADO },
            },
          },
        },
      ],
    },
    orderBy: [
      { car: { order: "asc" } },
      { name: "asc" },
    ],
    include: {
      currentState: true,
      primaryPhoto: true,
      car: true,
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
      car: true,
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

