-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('BACKLOG', 'FOKUS', 'ERREICHT', 'ARCHIVIERT');

-- CreateEnum
CREATE TYPE "Ampel" AS ENUM ('GRUEN', 'GELB', 'ROT');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'DOING', 'DONE');

-- CreateEnum
CREATE TYPE "EnrichmentSource" AS ENUM ('USER', 'AI_OLLAMA', 'AI_CLOUD');

-- CreateTable
CREATE TABLE "rechtseinheit" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kuerzel" TEXT,

    CONSTRAINT "rechtseinheit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goal" (
    "id" TEXT NOT NULL,
    "titel" TEXT NOT NULL,
    "outcome" TEXT,
    "status" "GoalStatus" NOT NULL DEFAULT 'BACKLOG',
    "ampel" "Ampel" NOT NULL DEFAULT 'GELB',
    "fortschritt" INTEGER NOT NULL DEFAULT 0,
    "dueDate" TIMESTAMP(3),
    "abhaengig" BOOLEAN NOT NULL DEFAULT false,
    "ownerId" TEXT NOT NULL,
    "rechtseinheitId" TEXT NOT NULL,
    "parentGoalId" TEXT,
    "zugewiesenVon" TEXT,
    "aiVorschlag" JSONB,
    "aiConfidence" DOUBLE PRECISION,
    "aiEnrichedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_measure" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "beschreibung" TEXT NOT NULL,
    "zielwert" INTEGER NOT NULL,
    "istwert" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "lead_measure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_log" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "erwartet" TEXT NOT NULL,
    "tatsaechlich" TEXT,
    "reviewAm" TIMESTAMP(3),

    CONSTRAINT "learning_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task" (
    "id" TEXT NOT NULL,
    "goalId" TEXT,
    "titel" TEXT NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "position" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "important" BOOLEAN NOT NULL DEFAULT false,
    "urgent" BOOLEAN NOT NULL DEFAULT false,
    "dueDate" TIMESTAMP(3),
    "zeitGeplantMin" INTEGER,
    "zeitIstMin" INTEGER,
    "aiQuadrantSuggestion" INTEGER,
    "aiConfidence" DOUBLE PRECISION,
    "aiReasoning" TEXT,
    "lastModifiedBy" "EnrichmentSource" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "goal_ownerId_status_idx" ON "goal"("ownerId", "status");

-- CreateIndex
CREATE INDEX "goal_rechtseinheitId_status_idx" ON "goal"("rechtseinheitId", "status");

-- CreateIndex
CREATE INDEX "lead_measure_goalId_idx" ON "lead_measure"("goalId");

-- CreateIndex
CREATE UNIQUE INDEX "learning_log_goalId_key" ON "learning_log"("goalId");

-- CreateIndex
CREATE INDEX "task_goalId_status_idx" ON "task"("goalId", "status");

-- AddForeignKey
ALTER TABLE "goal" ADD CONSTRAINT "goal_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal" ADD CONSTRAINT "goal_rechtseinheitId_fkey" FOREIGN KEY ("rechtseinheitId") REFERENCES "rechtseinheit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal" ADD CONSTRAINT "goal_parentGoalId_fkey" FOREIGN KEY ("parentGoalId") REFERENCES "goal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_measure" ADD CONSTRAINT "lead_measure_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_log" ADD CONSTRAINT "learning_log_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task" ADD CONSTRAINT "task_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "goal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
