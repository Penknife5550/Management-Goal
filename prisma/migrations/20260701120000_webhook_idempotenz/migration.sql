-- CreateTable
CREATE TABLE "webhook_idempotency" (
    "id" TEXT NOT NULL,
    "jobKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_idempotency_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "webhook_idempotency_jobKey_key" ON "webhook_idempotency"("jobKey");

-- CreateIndex
CREATE INDEX "webhook_idempotency_createdAt_idx" ON "webhook_idempotency"("createdAt");
