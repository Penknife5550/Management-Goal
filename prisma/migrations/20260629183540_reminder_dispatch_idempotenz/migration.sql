-- CreateTable
CREATE TABLE "reminder_dispatch" (
    "id" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reminder_dispatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reminder_dispatch_recipient_event_periodKey_key" ON "reminder_dispatch"("recipient", "event", "periodKey");
