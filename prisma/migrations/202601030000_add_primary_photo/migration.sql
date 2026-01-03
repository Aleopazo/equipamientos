-- AlterTable
ALTER TABLE "Equipment" ADD COLUMN     "primaryPhotoId" TEXT;

-- AlterTable
ALTER TABLE "EquipmentFile" ADD COLUMN     "isPrimary" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "Equipment_primaryPhotoId_key" ON "Equipment"("primaryPhotoId");

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_primaryPhotoId_fkey" FOREIGN KEY ("primaryPhotoId") REFERENCES "EquipmentFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

