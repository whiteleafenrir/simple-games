-- T2: preserve all pets and refuse installation if legacy duplicates exist.
BEGIN;

LOCK TABLE "Pet" IN SHARE ROW EXCLUSIVE MODE;

DO $$
BEGIN
  IF EXISTS (
    SELECT "guestSessionId" FROM "Pet"
    WHERE "status" = 'pet'
    GROUP BY "guestSessionId" HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Multiple active pets exist for a guest. Resolve them explicitly before applying T2; no data has been deleted.';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "Pet_one_active_per_guest"
  ON "Pet"("guestSessionId") WHERE "status" = 'pet';

COMMIT;
