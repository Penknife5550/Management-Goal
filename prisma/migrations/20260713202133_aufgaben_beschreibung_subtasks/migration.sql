-- AlterTable
ALTER TABLE "task" ADD COLUMN     "beschreibung" TEXT;

-- CreateTable
CREATE TABLE "subtask" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "titel" TEXT NOT NULL,
    "erledigt" BOOLEAN NOT NULL DEFAULT false,
    "position" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subtask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "subtask_taskId_idx" ON "subtask"("taskId");

-- AddForeignKey
ALTER TABLE "subtask" ADD CONSTRAINT "subtask_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
