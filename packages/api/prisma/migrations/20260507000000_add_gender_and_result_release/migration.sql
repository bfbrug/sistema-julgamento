-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "CategoryGenderMode" AS ENUM ('MIXED', 'MALE_ONLY', 'FEMALE_ONLY', 'UNISEX_SPLIT');

-- AlterTable: add gender as nullable first, backfill, then set NOT NULL
ALTER TABLE "participants" ADD COLUMN "gender" "Gender";
UPDATE "participants" SET "gender" = 'MALE' WHERE "gender" IS NULL;
ALTER TABLE "participants" ALTER COLUMN "gender" SET NOT NULL;

-- CreateIndex
CREATE INDEX "participants_eventId_gender_idx" ON "participants"("eventId", "gender");

-- AlterTable
ALTER TABLE "categories" ADD COLUMN "gender_mode" "CategoryGenderMode" NOT NULL DEFAULT 'MIXED';

-- CreateTable
CREATE TABLE "result_releases" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "gender" "Gender",
    "position" INTEGER NOT NULL,
    "releasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedById" TEXT NOT NULL,

    CONSTRAINT "result_releases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "result_releases_eventId_idx" ON "result_releases"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "result_releases_categoryId_gender_position_key" ON "result_releases"("categoryId", "gender", "position");

-- AddForeignKey
ALTER TABLE "result_releases" ADD CONSTRAINT "result_releases_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "judging_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "result_releases" ADD CONSTRAINT "result_releases_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "result_releases" ADD CONSTRAINT "result_releases_releasedById_fkey" FOREIGN KEY ("releasedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
