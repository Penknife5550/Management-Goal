-- CreateTable
CREATE TABLE "q2_block" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "titel" TEXT NOT NULL,
    "wochentag" INTEGER NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "dauerMin" INTEGER NOT NULL DEFAULT 60,
    "goalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "q2_block_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "q2_block_ownerId_idx" ON "q2_block"("ownerId");

-- AddForeignKey
ALTER TABLE "q2_block" ADD CONSTRAINT "q2_block_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "goal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
