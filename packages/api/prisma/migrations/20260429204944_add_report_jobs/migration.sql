-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('TOP_N', 'GENERAL', 'DETAILED_BY_JUDGE');

-- CreateEnum
CREATE TYPE "ReportJobStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "report_jobs" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "type" "ReportType" NOT NULL,
    "status" "ReportJobStatus" NOT NULL DEFAULT 'QUEUED',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "filePath" TEXT,
    "verificationCode" TEXT,
    "error" TEXT,
    "requestedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "report_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "report_jobs_eventId_type_status_idx" ON "report_jobs"("eventId", "type", "status");

-- AddForeignKey
ALTER TABLE "report_jobs" ADD CONSTRAINT "report_jobs_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "judging_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
