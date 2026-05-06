-- Step 1: Add column as nullable first
ALTER TABLE "users" ADD COLUMN "username" TEXT;

-- Step 2: Backfill existing rows
UPDATE "users" SET username = split_part(email, '@', 1) || '_' || LEFT(id, 4) WHERE username IS NULL OR username = '';

-- Step 3: Apply NOT NULL constraint
ALTER TABLE "users" ALTER COLUMN "username" SET NOT NULL;

-- Step 4: Add unique constraint
ALTER TABLE "users" ADD CONSTRAINT "users_username_key" UNIQUE ("username");

-- Step 5: Add index
CREATE INDEX "users_username_idx" ON "users"("username");
