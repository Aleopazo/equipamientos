-- CreateTable
CREATE TABLE "Car" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Car_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Car_code_key" ON "Car"("code");

-- CreateIndex
CREATE INDEX "Car_order_idx" ON "Car"("order");

-- Seed default cars
INSERT INTO "Car" ("id", "name", "code", "description", "order", "updatedAt")
VALUES
  ('car-01', 'Carro 1', 'CAR-01', 'Unidad principal de limpieza solar.', 1, CURRENT_TIMESTAMP),
  ('car-02', 'Carro 2', 'CAR-02', 'Unidad secundaria de soporte.', 2, CURRENT_TIMESTAMP),
  ('car-03', 'Carro 3', 'CAR-03', 'Unidad para turnos de mantenimiento.', 3, CURRENT_TIMESTAMP),
  ('car-04', 'Carro 4', 'CAR-04', 'Unidad asignada a clientes industriales.', 4, CURRENT_TIMESTAMP),
  ('car-05', 'Carro 5', 'CAR-05', 'Unidad para operaciones en altura.', 5, CURRENT_TIMESTAMP),
  ('car-06', 'Carro 6', 'CAR-06', 'Unidad de respaldo y contingencia.', 6, CURRENT_TIMESTAMP);

-- Add new column allowing null temporarily
ALTER TABLE "Equipment" ADD COLUMN "carId" TEXT;

-- Assign existing equipment to Carro 1 and actualizar códigos legacy
UPDATE "Equipment"
SET
  "carId" = 'car-01',
  "code" = CASE
    WHEN "code" LIKE '%-C01' THEN "code"
    ELSE CONCAT("code", '-C01')
  END;

-- Enforce NOT NULL constraint
ALTER TABLE "Equipment"
ALTER COLUMN "carId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Equipment_carId_idx" ON "Equipment"("carId");

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE CASCADE ON UPDATE CASCADE;
