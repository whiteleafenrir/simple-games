CREATE TABLE "PetQuestionAttempt" (
    "id" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "definition" JSONB NOT NULL,
    "optionOrder" TEXT[] NOT NULL,
    "language" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "outcome" TEXT,
    "selectedOptionId" TEXT,
    "activityCompleted" BOOLEAN,
    "happinessChange" DOUBLE PRECISION,
    "trustChange" DOUBLE PRECISION,
    CONSTRAINT "PetQuestionAttempt_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PetQuestionAttempt_language" CHECK ("language" IN ('ru', 'en')),
    CONSTRAINT "PetQuestionAttempt_option_order" CHECK (cardinality("optionOrder") = 4),
    CONSTRAINT "PetQuestionAttempt_result" CHECK (
      ("completedAt" IS NULL AND "outcome" IS NULL AND "selectedOptionId" IS NULL
       AND "activityCompleted" IS NULL AND "happinessChange" IS NULL AND "trustChange" IS NULL)
      OR
      ("completedAt" IS NOT NULL AND "completedAt" >= "issuedAt" AND "outcome" IS NOT NULL
       AND "activityCompleted" IS NOT NULL AND "happinessChange" IS NOT NULL AND "trustChange" IS NOT NULL
       AND "happinessChange" BETWEEN -100 AND 100 AND "trustChange" BETWEEN -100 AND 100
       AND (("outcome" = 'declined' AND "selectedOptionId" IS NULL AND NOT "activityCompleted")
         OR ("outcome" IN ('correct', 'incorrect') AND "selectedOptionId" IS NOT NULL
             AND "selectedOptionId" = ANY("optionOrder") AND "activityCompleted")))
    )
);
CREATE INDEX "PetQuestionAttempt_petId_issuedAt_id_idx" ON "PetQuestionAttempt"("petId", "issuedAt", "id");
CREATE INDEX "PetQuestionAttempt_petId_completedAt_id_idx" ON "PetQuestionAttempt"("petId", "completedAt", "id");
CREATE UNIQUE INDEX "PetQuestionAttempt_one_pending" ON "PetQuestionAttempt"("petId") WHERE "completedAt" IS NULL;
ALTER TABLE "PetQuestionAttempt" ADD CONSTRAINT "PetQuestionAttempt_petId_fkey"
  FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
