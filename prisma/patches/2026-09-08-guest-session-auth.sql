-- T1: additive update for an existing local MVP database.
-- Existing guests and pets remain intact; legacy guests have no credentials.
BEGIN;

ALTER TABLE "GuestSession"
  ADD COLUMN IF NOT EXISTS "tokenHash" TEXT,
  ADD COLUMN IF NOT EXISTS "tokenExpiresAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "GuestSession_tokenHash_key"
  ON "GuestSession"("tokenHash");

COMMIT;
