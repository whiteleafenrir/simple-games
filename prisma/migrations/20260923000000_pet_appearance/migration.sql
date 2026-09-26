ALTER TABLE "Pet"
  ADD COLUMN "coatColor" TEXT NOT NULL DEFAULT 'natural',
  ADD COLUMN "coatPattern" TEXT NOT NULL DEFAULT 'plain',
  ADD CONSTRAINT "Pet_coatColor_check" CHECK ("coatColor" IN ('natural', 'honey', 'ash', 'rose', 'lavender', 'mint')),
  ADD CONSTRAINT "Pet_coatPattern_check" CHECK ("coatPattern" IN ('plain', 'spots', 'stripes'));
