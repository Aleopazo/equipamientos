-- Alter existing TicketStatus enum to new workflow values
ALTER TYPE "TicketStatus" RENAME TO "TicketStatus_old";

CREATE TYPE "TicketStatus" AS ENUM ('CREADO', 'EN_PROCESO', 'FINALIZADO');

ALTER TABLE "Ticket"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "TicketStatus" USING (
    CASE "status"::text
      WHEN 'OPEN' THEN 'CREADO'
      WHEN 'IN_PROGRESS' THEN 'EN_PROCESO'
      WHEN 'BLOCKED' THEN 'EN_PROCESO'
      WHEN 'RESOLVED' THEN 'FINALIZADO'
      WHEN 'CLOSED' THEN 'FINALIZADO'
      ELSE 'CREADO'
    END
  )::"TicketStatus",
  ALTER COLUMN "status" SET DEFAULT 'CREADO';

DROP TYPE "TicketStatus_old";

-- Create table to support ticket comments
CREATE TABLE "TicketComment" (
  "id" TEXT NOT NULL,
  "ticketId" TEXT NOT NULL,
  "author" TEXT,
  "message" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TicketComment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TicketComment_ticketId_fkey"
    FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "TicketComment_ticketId_idx" ON "TicketComment"("ticketId");
