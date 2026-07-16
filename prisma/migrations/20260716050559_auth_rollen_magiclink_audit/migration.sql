-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'NUTZER');

-- AlterTable: rechtseinheitId zunaechst nullable anlegen, Bestandszeilen
-- backfillen (die geseedete Rechtseinheit existiert garantiert), dann NOT NULL.
ALTER TABLE "user" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "passwordHash" TEXT,
ADD COLUMN     "rechtseinheitId" TEXT,
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'NUTZER';

-- Backfill: alle Bestandsnutzer der ersten (geseedeten) Rechtseinheit zuordnen.
UPDATE "user" SET "rechtseinheitId" = (SELECT "id" FROM "rechtseinheit" ORDER BY "id" LIMIT 1)
WHERE "rechtseinheitId" IS NULL;

ALTER TABLE "user" ALTER COLUMN "rechtseinheitId" SET NOT NULL;

-- CreateTable
CREATE TABLE "magic_link_token" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "magic_link_token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "aktion" TEXT NOT NULL,
    "details" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "magic_link_token_tokenHash_key" ON "magic_link_token"("tokenHash");

-- CreateIndex
CREATE INDEX "magic_link_token_createdAt_idx" ON "magic_link_token"("createdAt");

-- CreateIndex
CREATE INDEX "audit_log_userId_idx" ON "audit_log"("userId");

-- CreateIndex
CREATE INDEX "audit_log_aktion_idx" ON "audit_log"("aktion");

-- CreateIndex
CREATE INDEX "audit_log_createdAt_idx" ON "audit_log"("createdAt");

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_rechtseinheitId_fkey" FOREIGN KEY ("rechtseinheitId") REFERENCES "rechtseinheit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "magic_link_token" ADD CONSTRAINT "magic_link_token_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
