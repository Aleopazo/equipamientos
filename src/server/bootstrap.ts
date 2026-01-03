"use server";

import { cache } from "react";

import { prisma } from "@/lib/prisma";

const defaultStates = [
  {
    name: "Operativo",
    description: "Disponible para uso en terreno",
    level: 2,
    color: "#22C55E",
  },
  {
    name: "Revisión",
    description: "Requiere atención o verificación",
    level: 1,
    color: "#FACC15",
  },
  {
    name: "Crítico",
    description: "Fuera de servicio o en reparación",
    level: 0,
    color: "#EF4444",
  },
];

const defaultEquipment = [
  {
    name: "Carro Principal",
    code: "ECR-CRR-001",
    category: "Transporte",
    description: "Carro principal para traslado de equipos en terreno.",
    position: { x: 10, y: 20 },
  },
  {
    name: "Generador",
    code: "ECR-GEN-001",
    category: "Energía",
    description: "Generador eléctrico para suministro autónomo.",
    position: { x: 30, y: 20 },
  },
  {
    name: "Bomba Llenado Estanque",
    code: "ECR-BLE-001",
    category: "Hidráulica",
    description: "Bomba de llenado para estanques de agua.",
    position: { x: 50, y: 20 },
  },
  {
    name: "Bomba Presión Mangueras",
    code: "ECR-BPM-001",
    category: "Hidráulica",
    description: "Bomba de alta presión para alimentación de mangueras.",
    position: { x: 70, y: 20 },
  },
  {
    name: "SteadyPress",
    code: "ECR-STD-001",
    category: "Soporte",
    description: "Equipo SteadyPress para estabilización de flujo.",
    position: { x: 90, y: 20 },
  },
  {
    name: "Robot de Limpieza",
    code: "ECR-ROB-001",
    category: "Automatización",
    description: "Robot para limpieza automatizada de paneles.",
    position: { x: 110, y: 20 },
  },
  {
    name: "Sistema Hidráulico Auxiliar",
    code: "ECR-HID-001",
    category: "Hidráulica",
    description: "Sistema de soporte para componentes hidráulicos.",
    position: { x: 130, y: 20 },
  },
];

export const ensureSeedData = cache(async () => {
  const existingStates = await prisma.equipmentState.findMany();
  if (existingStates.length === 0) {
    await prisma.equipmentState.createMany({
      data: defaultStates,
    });
  }

  const currentStates = await prisma.equipmentState.findMany();
  const defaultStateId =
    currentStates.find((state) => state.name === "Operativo")?.id ?? currentStates[0]?.id;

  if (!defaultStateId) {
    throw new Error("No se pudo determinar un estado por defecto para los equipos.");
  }

  for (const equipment of defaultEquipment) {
    const exists = await prisma.equipment.findFirst({
      where: { code: equipment.code },
    });
    if (!exists) {
      await prisma.equipment.create({
        data: {
          ...equipment,
          currentStateId: defaultStateId,
        },
      });
    }
  }
});

