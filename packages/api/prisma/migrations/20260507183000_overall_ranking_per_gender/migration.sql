-- Renomeia enum (não há dados em produção; drop+create é seguro)
DROP TYPE IF EXISTS "EventGenderMode";
CREATE TYPE "EventGenderMode" AS ENUM ('MIXED', 'MALE_ONLY', 'FEMALE_ONLY', 'UNISEX_SPLIT');

-- Remove gender_mode de categories
ALTER TABLE "categories" DROP COLUMN IF EXISTS "gender_mode";

-- Remove FK e coluna category_id de result_releases
ALTER TABLE "result_releases" DROP CONSTRAINT IF EXISTS "result_releases_categoryId_fkey";
DROP INDEX IF EXISTS "result_releases_categoryId_position_idx";
-- Drop dos partial unique indexes antigos por (eventId, categoryId, gender, position)
DROP INDEX IF EXISTS "result_releases_eventId_categoryId_position_unique_mixed";
DROP INDEX IF EXISTS "result_releases_eventId_categoryId_gender_position_unique";
ALTER TABLE "result_releases" DROP COLUMN IF EXISTS "categoryId";

-- Adiciona gender_mode em judging_events
ALTER TABLE "judging_events" ADD COLUMN "gender_mode" "EventGenderMode" NOT NULL DEFAULT 'MIXED';

-- Drop do tipo antigo
DROP TYPE IF EXISTS "CategoryGenderMode";

-- Novos partial unique indexes em result_releases (gender pode ser NULL em MIXED)
CREATE UNIQUE INDEX "result_releases_event_position_mixed_unique"
  ON "result_releases" ("eventId", "position")
  WHERE "gender" IS NULL;
CREATE UNIQUE INDEX "result_releases_event_gender_position_unique"
  ON "result_releases" ("eventId", "gender", "position")
  WHERE "gender" IS NOT NULL;

CREATE INDEX "result_releases_eventId_gender_position_idx"
  ON "result_releases" ("eventId", "gender", "position");
