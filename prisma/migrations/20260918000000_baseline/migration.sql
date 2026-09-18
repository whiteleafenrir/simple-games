-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "GuestSession" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tokenHash" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),

    CONSTRAINT "GuestSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pet" (
    "id" TEXT NOT NULL,
    "guestSessionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "mood" TEXT NOT NULL,
    "periodOfLife" TEXT NOT NULL,
    "sessionLengthId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "lastResolvedAt" TIMESTAMP(3) NOT NULL,
    "isLightOn" BOOLEAN NOT NULL DEFAULT true,
    "awayUntil" TIMESTAMP(3),
    "careHistoryCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Pet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PetStats" (
    "petId" TEXT NOT NULL,
    "satiety" DOUBLE PRECISION NOT NULL,
    "cleanliness" DOUBLE PRECISION NOT NULL,
    "happiness" DOUBLE PRECISION NOT NULL,
    "health" DOUBLE PRECISION NOT NULL,
    "energy" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PetStats_pkey" PRIMARY KEY ("petId")
);

-- CreateTable
CREATE TABLE "PlayerEnergy" (
    "petId" TEXT NOT NULL,
    "current" DOUBLE PRECISION NOT NULL,
    "max" DOUBLE PRECISION NOT NULL,
    "lastRecoveredAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerEnergy_pkey" PRIMARY KEY ("petId")
);

-- CreateTable
CREATE TABLE "PetActionCooldown" (
    "petId" TEXT NOT NULL,
    "actionId" TEXT NOT NULL,
    "lastActionAt" TIMESTAMP(3),

    CONSTRAINT "PetActionCooldown_pkey" PRIMARY KEY ("petId","actionId")
);

-- CreateTable
CREATE TABLE "PetCareAction" (
    "id" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "actionId" TEXT NOT NULL,
    "activityType" TEXT NOT NULL,
    "appliedAt" TIMESTAMP(3) NOT NULL,
    "statsBefore" JSONB NOT NULL,
    "statsAfter" JSONB NOT NULL,
    "careScoreBefore" DOUBLE PRECISION NOT NULL,
    "careScoreAfter" DOUBLE PRECISION NOT NULL,
    "moodBefore" TEXT NOT NULL,
    "moodAfter" TEXT NOT NULL,
    "isLightOnBefore" BOOLEAN NOT NULL,
    "isLightOnAfter" BOOLEAN NOT NULL,
    "awayUntilBefore" TIMESTAMP(3),
    "awayUntilAfter" TIMESTAMP(3),
    "playerEnergyCost" INTEGER NOT NULL,
    "perceptionTags" TEXT[],

    CONSTRAINT "PetCareAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PetFarewellResult" (
    "petId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "farewellAt" TIMESTAMP(3) NOT NULL,
    "phraseId" TEXT NOT NULL,
    "finalCareScore" DOUBLE PRECISION NOT NULL,
    "finalStats" JSONB NOT NULL,

    CONSTRAINT "PetFarewellResult_pkey" PRIMARY KEY ("petId")
);

-- CreateIndex
CREATE UNIQUE INDEX "GuestSession_tokenHash_key" ON "GuestSession"("tokenHash");

-- CreateIndex
CREATE INDEX "Pet_guestSessionId_idx" ON "Pet"("guestSessionId");

-- CreateIndex
CREATE INDEX "Pet_guestSessionId_status_idx" ON "Pet"("guestSessionId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Pet_one_active_per_guest" ON "Pet"("guestSessionId") WHERE ("status" = 'pet');

-- CreateIndex
CREATE INDEX "PetCareAction_petId_appliedAt_id_idx" ON "PetCareAction"("petId", "appliedAt", "id");

-- AddForeignKey
ALTER TABLE "Pet" ADD CONSTRAINT "Pet_guestSessionId_fkey" FOREIGN KEY ("guestSessionId") REFERENCES "GuestSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PetStats" ADD CONSTRAINT "PetStats_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerEnergy" ADD CONSTRAINT "PlayerEnergy_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PetActionCooldown" ADD CONSTRAINT "PetActionCooldown_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PetCareAction" ADD CONSTRAINT "PetCareAction_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PetFarewellResult" ADD CONSTRAINT "PetFarewellResult_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
