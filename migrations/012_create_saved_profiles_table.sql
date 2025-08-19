-- Create saved_profiles table
CREATE TABLE IF NOT EXISTS "saved_profiles" (
  "id" INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "user_id" UUID NOT NULL REFERENCES "users"("id"),
  "saved_user_id" UUID NOT NULL REFERENCES "users"("id"),
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE("user_id", "saved_user_id") -- Prevent duplicate saves
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS "idx_saved_profiles_user_id" ON "saved_profiles"("user_id");
CREATE INDEX IF NOT EXISTS "idx_saved_profiles_saved_user_id" ON "saved_profiles"("saved_user_id");