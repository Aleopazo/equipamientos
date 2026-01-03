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

const defaultCars = [
  {
    name: "Carro 1",
    code: "CAR-01",
    description: "Unidad principal de limpieza solar.",
    order: 1,
  },
  {
    name: "Carro 2",
    code: "CAR-02",
    description: "Unidad secundaria de soporte.",
    order: 2,
  },
  {
    name: "Carro 3",
    code: "CAR-03",
    description: "Unidad para turnos de mantenimiento.",
    order: 3,
  },
  {
    name: "Carro 4",
    code: "CAR-04",
    description: "Unidad asignada a clientes industriales.",
    order: 4,
  },
  {
    name: "Carro 5",
    code: "CAR-05",
    description: "Unidad para operaciones en altura.",
    order: 5,
  },
  {
    name: "Carro 6",
    code: "CAR-06",
    description: "Unidad de respaldo y contingencia.",
    order: 6,
  },
];

const equipmentTemplates = [
  {
    name: "Carro Principal",
    baseCode: "ECR-CRR-001",
    category: "Transporte",
    description: "Carro principal para traslado de equipos en terreno.",
    position: { x: 10, y: 20 },
  },
  {
    name: "Generador",
    baseCode: "ECR-GEN-001",
    category: "Energía",
    description: "Generador eléctrico para suministro autónomo.",
    position: { x: 30, y: 20 },
  },
  {
    name: "Bomba Llenado Estanque",
    baseCode: "ECR-BLE-001",
    category: "Hidráulica",
    description: "Bomba de llenado para estanques de agua.",
    position: { x: 50, y: 20 },
  },
  {
    name: "Bomba Presión Mangueras",
    baseCode: "ECR-BPM-001",
    category: "Hidráulica",
    description: "Bomba de alta presión para alimentación de mangueras.",
    position: { x: 70, y: 20 },
  },
  {
    name: "SteadyPress",
    baseCode: "ECR-STD-001",
    category: "Soporte",
    description: "Equipo SteadyPress para estabilización de flujo.",
    position: { x: 90, y: 20 },
  },
  {
    name: "Robot de Limpieza",
    baseCode: "ECR-ROB-001",
    category: "Automatización",
    description: "Robot para limpieza automatizada de paneles.",
    position: { x: 110, y: 20 },
  },
  {
    name: "Sistema Hidráulico Auxiliar",
    baseCode: "ECR-HID-001",
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

  const cars = await Promise.all(
    defaultCars.map((car) =>
      prisma.car.upsert({
        where: { code: car.code },
        create: car,
        update: {
          name: car.name,
          order: car.order,
          description: car.description,
        },
      }),
    ),
  );

  for (const car of cars) {
    const orderSuffix = car.order.toString().padStart(2, "0");

    for (const template of equipmentTemplates) {
      const code = `${template.baseCode}-C${orderSuffix}`;

      await prisma.equipment.upsert({
        where: { code },
        update: {
          carId: car.id,
          name: template.name,
          category: template.category,
          description: template.description,
          position: template.position,
        },
        create: {
          name: template.name,
          code,
          category: template.category,
          description: template.description,
          position: template.position,
          carId: car.id,
          currentStateId: defaultStateId,
        },
      });
    }
  }
});

