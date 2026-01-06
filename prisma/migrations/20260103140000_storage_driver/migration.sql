-- CreateEnum
CREATE TYPE "StorageDriver" AS ENUM ('FILE_SYSTEM', 'DATABASE');

-- AlterTable
ALTER TABLE "EquipmentFile"
ADD COLUMN     "data" BYTEA,
ADD COLUMN     "storageType" "StorageDriver" NOT NULL DEFAULT 'FILE_SYSTEM',
ALTER COLUMN   "storedPath" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "EquipmentFile_storageType_idx" ON "EquipmentFile"("storageType");

