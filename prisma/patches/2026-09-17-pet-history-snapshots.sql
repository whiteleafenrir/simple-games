-- Stop the old API before applying T4; the new API maintains the counter atomically.
BEGIN;
LOCK TABLE "Pet", "PetCareAction" IN SHARE ROW EXCLUSIVE MODE;
ALTER TABLE "Pet" ADD COLUMN IF NOT EXISTS "careHistoryCount" INTEGER NOT NULL DEFAULT 0;
UPDATE "Pet" AS pet SET "careHistoryCount" = (
  SELECT count(*)::integer FROM "PetCareAction" AS event WHERE event."petId" = pet.id
);
CREATE INDEX IF NOT EXISTS "PetCareAction_petId_appliedAt_id_idx"
  ON "PetCareAction"("petId", "appliedAt", "id");
DROP INDEX IF EXISTS "PetCareAction_petId_appliedAt_idx";
COMMIT;
