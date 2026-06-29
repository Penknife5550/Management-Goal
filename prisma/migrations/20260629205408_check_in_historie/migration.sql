-- CreateTable
CREATE TABLE "check_in" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "ampel" "Ampel" NOT NULL,
    "fortschritt" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "check_in_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "check_in_goalId_createdAt_idx" ON "check_in"("goalId", "createdAt");

-- CreateIndex
CREATE INDEX "check_in_ownerId_sessionId_idx" ON "check_in"("ownerId", "sessionId");

-- AddForeignKey
ALTER TABLE "check_in" ADD CONSTRAINT "check_in_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
