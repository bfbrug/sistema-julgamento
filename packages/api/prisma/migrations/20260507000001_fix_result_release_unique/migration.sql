-- Fix: replace standard unique index (broken for nullable gender) with two partial unique indexes

-- Drop the old unique index created in migration 20260507000000
DROP INDEX IF EXISTS "result_releases_categoryId_gender_position_key";

-- Unique parcial para categorias com gênero (MALE ou FEMALE)
CREATE UNIQUE INDEX "result_releases_cat_gender_pos_key"
  ON "result_releases" ("categoryId", "gender", "position")
  WHERE "gender" IS NOT NULL;

-- Unique parcial para categorias mistas (gender IS NULL)
CREATE UNIQUE INDEX "result_releases_cat_null_gender_pos_key"
  ON "result_releases" ("categoryId", "position")
  WHERE "gender" IS NULL;

-- Issue 2: index on releasedById for query performance
CREATE INDEX "result_releases_released_by_id_idx" ON "result_releases" ("releasedById");
