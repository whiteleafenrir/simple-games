BEGIN;

-- Give existing pets a neutral starting value without rewriting history or farewells.
ALTER TABLE "Pet" ADD COLUMN "trust" DOUBLE PRECISION NOT NULL DEFAULT 50;
ALTER TABLE "Pet" ADD CONSTRAINT "Pet_trust_range" CHECK ("trust" >= 0 AND "trust" <= 100);

COMMIT;
