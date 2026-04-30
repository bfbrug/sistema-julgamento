-- CreateEnum
CREATE TYPE "CalculationRule" AS ENUM ('R1', 'R2');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'REGISTERING', 'IN_PROGRESS', 'FINISHED');

-- CreateEnum
CREATE TYPE "ParticipantState" AS ENUM ('WAITING', 'PREVIEW', 'SCORING', 'REVIEW', 'FINISHED', 'ABSENT');

-- CreateTable
CREATE TABLE "judging_events" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "eventDate" DATE NOT NULL,
    "location" TEXT NOT NULL,
    "organizer" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "calculationRule" "CalculationRule" NOT NULL DEFAULT 'R1',
    "scoreMin" DECIMAL(3,1) NOT NULL,
    "scoreMax" DECIMAL(3,1) NOT NULL,
    "topN" INTEGER NOT NULL DEFAULT 10,
    "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "certificateText" TEXT,

    CONSTRAINT "judging_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "judges" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "judges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "judge_categories" (
    "id" TEXT NOT NULL,
    "judgeId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "judge_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participants" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "photoPath" TEXT,
    "presentationOrder" INTEGER NOT NULL,
    "isAbsent" BOOLEAN NOT NULL DEFAULT false,
    "currentState" "ParticipantState" NOT NULL DEFAULT 'WAITING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participant_state_logs" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "state" "ParticipantState" NOT NULL,
    "enteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedByUserId" TEXT,

    CONSTRAINT "participant_state_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scores" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "judgeId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "value" DECIMAL(3,1) NOT NULL,
    "isFinalized" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "finalizedAt" TIMESTAMP(3),

    CONSTRAINT "scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tiebreaker_configs" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "firstCategoryId" TEXT,
    "secondCategoryId" TEXT,

    CONSTRAINT "tiebreaker_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificate_configs" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "backgroundPath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "certificate_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificate_signatures" (
    "id" TEXT NOT NULL,
    "certificateConfigId" TEXT NOT NULL,
    "personName" TEXT NOT NULL,
    "personRole" TEXT NOT NULL,
    "imagePath" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL,

    CONSTRAINT "certificate_signatures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorType" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "judging_events_managerId_idx" ON "judging_events"("managerId");

-- CreateIndex
CREATE INDEX "judging_events_status_idx" ON "judging_events"("status");

-- CreateIndex
CREATE INDEX "categories_eventId_idx" ON "categories"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "categories_eventId_name_key" ON "categories"("eventId", "name");

-- CreateIndex
CREATE INDEX "judges_eventId_idx" ON "judges"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "judges_userId_eventId_key" ON "judges"("userId", "eventId");

-- CreateIndex
CREATE INDEX "judge_categories_categoryId_idx" ON "judge_categories"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "judge_categories_judgeId_categoryId_key" ON "judge_categories"("judgeId", "categoryId");

-- CreateIndex
CREATE INDEX "participants_eventId_idx" ON "participants"("eventId");

-- CreateIndex
CREATE INDEX "participants_currentState_idx" ON "participants"("currentState");

-- CreateIndex
CREATE UNIQUE INDEX "participants_eventId_presentationOrder_key" ON "participants"("eventId", "presentationOrder");

-- CreateIndex
CREATE INDEX "participant_state_logs_participantId_idx" ON "participant_state_logs"("participantId");

-- CreateIndex
CREATE INDEX "scores_participantId_idx" ON "scores"("participantId");

-- CreateIndex
CREATE INDEX "scores_judgeId_idx" ON "scores"("judgeId");

-- CreateIndex
CREATE INDEX "scores_categoryId_idx" ON "scores"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "scores_participantId_judgeId_categoryId_key" ON "scores"("participantId", "judgeId", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "tiebreaker_configs_eventId_key" ON "tiebreaker_configs"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "tiebreaker_configs_firstCategoryId_key" ON "tiebreaker_configs"("firstCategoryId");

-- CreateIndex
CREATE UNIQUE INDEX "tiebreaker_configs_secondCategoryId_key" ON "tiebreaker_configs"("secondCategoryId");

-- CreateIndex
CREATE UNIQUE INDEX "certificate_configs_eventId_key" ON "certificate_configs"("eventId");

-- CreateIndex
CREATE INDEX "certificate_signatures_certificateConfigId_idx" ON "certificate_signatures"("certificateConfigId");

-- CreateIndex
CREATE UNIQUE INDEX "certificate_signatures_certificateConfigId_displayOrder_key" ON "certificate_signatures"("certificateConfigId", "displayOrder");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_actorId_idx" ON "audit_logs"("actorId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- AddForeignKey
ALTER TABLE "judging_events" ADD CONSTRAINT "judging_events_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "judging_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "judges" ADD CONSTRAINT "judges_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "judges" ADD CONSTRAINT "judges_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "judging_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "judge_categories" ADD CONSTRAINT "judge_categories_judgeId_fkey" FOREIGN KEY ("judgeId") REFERENCES "judges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "judge_categories" ADD CONSTRAINT "judge_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participants" ADD CONSTRAINT "participants_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "judging_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participant_state_logs" ADD CONSTRAINT "participant_state_logs_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participant_state_logs" ADD CONSTRAINT "participant_state_logs_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scores" ADD CONSTRAINT "scores_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scores" ADD CONSTRAINT "scores_judgeId_fkey" FOREIGN KEY ("judgeId") REFERENCES "judges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scores" ADD CONSTRAINT "scores_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tiebreaker_configs" ADD CONSTRAINT "tiebreaker_configs_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "judging_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tiebreaker_configs" ADD CONSTRAINT "tiebreaker_configs_firstCategoryId_fkey" FOREIGN KEY ("firstCategoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tiebreaker_configs" ADD CONSTRAINT "tiebreaker_configs_secondCategoryId_fkey" FOREIGN KEY ("secondCategoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate_configs" ADD CONSTRAINT "certificate_configs_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "judging_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate_signatures" ADD CONSTRAINT "certificate_signatures_certificateConfigId_fkey" FOREIGN KEY ("certificateConfigId") REFERENCES "certificate_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
