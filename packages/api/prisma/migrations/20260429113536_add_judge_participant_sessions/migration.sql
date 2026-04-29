-- CreateEnum
CREATE TYPE "JudgeSessionStatus" AS ENUM ('NOT_STARTED', 'IN_SCORING', 'IN_REVIEW', 'FINISHED');

-- CreateTable
CREATE TABLE "judge_participant_sessions" (
    "id" TEXT NOT NULL,
    "judgeId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "status" "JudgeSessionStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "startedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "finalizedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "judge_participant_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "judge_participant_sessions_participantId_idx" ON "judge_participant_sessions"("participantId");

-- CreateIndex
CREATE INDEX "judge_participant_sessions_status_idx" ON "judge_participant_sessions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "judge_participant_sessions_judgeId_participantId_key" ON "judge_participant_sessions"("judgeId", "participantId");

-- AddForeignKey
ALTER TABLE "judge_participant_sessions" ADD CONSTRAINT "judge_participant_sessions_judgeId_fkey" FOREIGN KEY ("judgeId") REFERENCES "judges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "judge_participant_sessions" ADD CONSTRAINT "judge_participant_sessions_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
