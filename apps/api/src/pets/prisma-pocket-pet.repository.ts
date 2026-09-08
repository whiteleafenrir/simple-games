import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { isDeepStrictEqual } from 'node:util';

import { PrismaService } from '../prisma/prisma.service';
import {
  GuestSession,
  OwnedPet,
  PetCareActionEntry,
  PetCareActionId,
  PetId,
  PetMode,
  PetMood,
  PetPeriodOfLife,
  PetStatus,
  PetStats,
  PlayerEnergyState,
  SessionLengthId
} from './pet-domain.types';
import {
  createEmptyLastActionAt,
  createInitialPlayerEnergy,
  normalizeStats,
  PET_CARE_ACTIONS,
  PET_CARE_ACTION_IDS
} from './pet-engine';
import { ActivePetConflictError, GuestSessionNotFoundError, PocketPetRepository, PocketPetTransaction } from './pocket-pet.repository';

@Injectable()
export class PrismaPocketPetRepository implements PocketPetRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createAuthenticatedGuestSession(tokenHash: string, tokenExpiresAt: Date, now: Date): Promise<GuestSession> {
    const session = await this.prisma.guestSession.create({
      data: { tokenHash, tokenExpiresAt, createdAt: now, lastSeenAt: now }
    });
    return toGuestSession(session);
  }

  async findGuestSessionByTokenHash(tokenHash: string, now: Date): Promise<GuestSession | null> {
    const session = await this.prisma.guestSession.findUnique({
      where: { tokenHash, tokenExpiresAt: { gt: now } }
    });
    return session ? toGuestSession(session) : null;
  }

  async renewGuestSessionToken(guestId: string, tokenHash: string, tokenExpiresAt: Date, now: Date): Promise<GuestSession | null> {
    const session = await this.prisma.guestSession.updateMany({
      where: { id: guestId, tokenHash, tokenExpiresAt: { gt: now } },
      data: { tokenExpiresAt, lastSeenAt: now }
    });
    return session.count > 0 ? this.findGuestSessionByTokenHash(tokenHash, now) : null;
  }

  async getOrCreateGuestSession(guestId: string | null, now: Date): Promise<GuestSession> {
    const client = this.prismaClient();

    if (guestId) {
      const existingSession = await client.guestSession.findUnique({
        where: {
          id: guestId
        }
      });

      if (existingSession) {
        return toGuestSession(await client.guestSession.update({
          where: {
            id: guestId
          },
          data: {
            lastSeenAt: now
          }
        }));
      }
    }

    return toGuestSession(await client.guestSession.create({
      data: {
        ...(guestId ? { id: guestId } : {}),
        createdAt: now,
        lastSeenAt: now
      }
    }));
  }

  async touchGuestSession(guestId: string, now: Date): Promise<GuestSession | null> {
    const client = this.prismaClient();
    const existingSession = await client.guestSession.findUnique({
      where: {
        id: guestId
      }
    });

    if (!existingSession) {
      return null;
    }

    return toGuestSession(await client.guestSession.update({
      where: {
        id: guestId
      },
      data: {
        lastSeenAt: now
      }
    }));
  }

  async withGuestTransaction<T>(guestId: string, operation: (transaction: PocketPetTransaction) => Promise<T>): Promise<T> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const guests = await tx.$queryRaw<{ id: string }[]>
          `SELECT "id" FROM "GuestSession" WHERE "id" = ${guestId} FOR UPDATE`;
        if (guests.length === 0) {
          throw new GuestSessionNotFoundError();
        }
        return operation(new PrismaPetTransaction(tx, guestId));
      }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, maxWait: 10_000, timeout: 15_000 });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const target = error.meta?.['target'];
        // PrismaPg can omit target when PostgreSQL's error messages are localized.
        // The explicit index name stays stable inside the driver's original message.
        const adapterError = error.meta?.['driverAdapterError'] as {
          cause?: { originalCode?: string; originalMessage?: string }
        } | undefined;
        if (error.meta?.['modelName'] === 'Pet' && (
          target === 'Pet_one_active_per_guest' ||
          (Array.isArray(target) && target.length === 1 && target[0] === 'guestSessionId') ||
          (adapterError?.cause?.originalCode === '23505' &&
            adapterError.cause.originalMessage?.includes('Pet_one_active_per_guest'))
        )) {
          throw new ActivePetConflictError();
        }
      }
      throw error;
    }
  }

  private prismaClient(): PrismaService {
    return this.prisma;
  }
}

// Only constructed after locking the guest; every read and write uses the same transaction.
class PrismaPetTransaction implements PocketPetTransaction {
  constructor(private readonly tx: Prisma.TransactionClient, private readonly guestId: string) {}

  async touchGuestSession(now: Date): Promise<void> {
    await this.tx.guestSession.update({ where: { id: this.guestId }, data: { lastSeenAt: now } });
  }

  async listPets(): Promise<OwnedPet[]> {
    const pets = await this.tx.pet.findMany({
      where: { guestSessionId: this.guestId }, include: petInclude(), orderBy: { createdAt: 'desc' }
    });
    return pets.map(toOwnedPet);
  }

  async getPet(petId: string): Promise<OwnedPet | null> {
    const pet = await this.tx.pet.findFirst({
      where: { id: petId, guestSessionId: this.guestId }, include: petInclude()
    });
    return pet ? toOwnedPet(pet) : null;
  }

  async createPet(pet: OwnedPet): Promise<OwnedPet> {
    await this.tx.pet.create({
      data: { id: pet.id, guestSessionId: this.guestId, ...petCoreData(pet) }
    });
    await this.tx.petStats.create({ data: { petId: pet.id, ...statsData(pet.stats) } });
    await this.tx.playerEnergy.create({ data: { petId: pet.id, ...playerEnergyData(pet.playerEnergy) } });
    await this.tx.petActionCooldown.createMany({
      data: PET_CARE_ACTION_IDS.map((actionId) => ({
        petId: pet.id, actionId, lastActionAt: dateOrNull(pet.lastActionAt[actionId])
      }))
    });
    if (pet.farewell) {
      await this.tx.petFarewellResult.create({ data: { petId: pet.id, ...farewellData(pet) } });
    }
    await this.saveHistory(pet);
    return this.requirePet(pet.id);
  }

  async savePet(pet: OwnedPet): Promise<OwnedPet> {
    await this.requirePet(pet.id);
    await this.tx.pet.update({ where: { id: pet.id, guestSessionId: this.guestId }, data: petCoreData(pet) });
    await this.tx.petStats.upsert({
      where: { petId: pet.id }, update: statsData(pet.stats), create: { petId: pet.id, ...statsData(pet.stats) }
    });
    await this.tx.playerEnergy.upsert({
      where: { petId: pet.id }, update: playerEnergyData(pet.playerEnergy),
      create: { petId: pet.id, ...playerEnergyData(pet.playerEnergy) }
    });
    for (const actionId of PET_CARE_ACTION_IDS) {
      const lastActionAt = dateOrNull(pet.lastActionAt[actionId]);
      await this.tx.petActionCooldown.upsert({
        where: { petId_actionId: { petId: pet.id, actionId } },
        update: { lastActionAt }, create: { petId: pet.id, actionId, lastActionAt }
      });
    }
    if (pet.farewell) {
      await this.tx.petFarewellResult.upsert({
        where: { petId: pet.id }, update: farewellData(pet), create: { petId: pet.id, ...farewellData(pet) }
      });
    } else {
      await this.tx.petFarewellResult.deleteMany({ where: { petId: pet.id } });
    }
    await this.saveHistory(pet);
    return this.requirePet(pet.id);
  }

  private async saveHistory(pet: OwnedPet): Promise<void> {
    for (const entry of pet.careHistory) {
      const existing = await this.tx.petCareAction.findUnique({ where: { id: entry.id } });
      if (existing) {
        if (existing.petId !== pet.id || !isDeepStrictEqual(normalizeCareHistory([existing])[0], entry)) {
          throw new Error('Care history event conflicts with its persisted owner or content.');
        }
      } else {
        await this.tx.petCareAction.create({ data: careHistoryData(pet.id, entry) });
      }
    }
  }

  private async requirePet(petId: string): Promise<OwnedPet> {
    const pet = await this.getPet(petId);
    if (!pet) {
      throw new Error('Pet does not belong to the transaction guest or was not persisted.');
    }
    return pet;
  }
}

function petInclude() {
  return {
    stats: true,
    playerEnergy: true,
    actionCooldowns: true,
    careHistory: {
      orderBy: [{ appliedAt: 'asc' }, { id: 'asc' }]
    },
    farewell: true
  } satisfies Prisma.PetInclude;
}

function toGuestSession(record: { id: string; createdAt: Date; lastSeenAt: Date }): GuestSession {
  return {
    id: String(record.id),
    createdAt: dateToIso(record.createdAt),
    lastSeenAt: dateToIso(record.lastSeenAt)
  };
}

function toOwnedPet(record: unknown): OwnedPet {
  const petRecord = record as Record<string, any>;

  return {
    id: String(petRecord.id),
    name: String(petRecord.name),
    petId: normalizePetId(petRecord.petId),
    mode: normalizePetMode(petRecord.mode),
    status: normalizeStatus(petRecord.status),
    mood: normalizeMood(petRecord.mood),
    periodOfLife: normalizePeriodOfLife(petRecord.periodOfLife),
    stats: normalizeStats(petRecord.stats as Partial<PetStats> | undefined),
    sessionLengthId: normalizeSessionLengthId(petRecord.sessionLengthId),
    createdAt: dateToIso(petRecord.createdAt),
    endsAt: dateToIso(petRecord.endsAt),
    lastResolvedAt: dateToIso(petRecord.lastResolvedAt),
    playerEnergy: normalizePlayerEnergy(petRecord.playerEnergy, petRecord.createdAt),
    lastActionAt: normalizeLastActionAt(petRecord.actionCooldowns),
    isLightOn: petRecord.isLightOn !== false,
    awayUntil: nullableDateToIso(petRecord.awayUntil),
    careHistory: normalizeCareHistory(petRecord.careHistory),
    farewell: petRecord.farewell ? {
      reason: petRecord.farewell.reason,
      farewellAt: dateToIso(petRecord.farewell.farewellAt),
      phraseId: petRecord.farewell.phraseId,
      finalCareScore: Number(petRecord.farewell.finalCareScore),
      finalStats: normalizeStats(petRecord.farewell.finalStats as Partial<PetStats>)
    } : null
  };
}

function normalizePlayerEnergy(value: unknown, createdAt: unknown): PlayerEnergyState {
  const energyRecord = value as Record<string, unknown> | null;

  if (!energyRecord) {
    return createInitialPlayerEnergy(new Date(dateToIso(createdAt)));
  }

  return {
    current: Number(energyRecord.current),
    max: Number(energyRecord.max),
    lastRecoveredAt: dateToIso(energyRecord.lastRecoveredAt)
  };
}

function normalizeLastActionAt(value: unknown): Record<PetCareActionId, string | null> {
  const lastActionAt = createEmptyLastActionAt();

  if (!Array.isArray(value)) {
    return lastActionAt;
  }

  for (const cooldown of value) {
    const cooldownRecord = cooldown as Record<string, unknown>;
    const actionId = cooldownRecord.actionId;

    if (isCareActionId(actionId)) {
      lastActionAt[actionId] = nullableDateToIso(cooldownRecord.lastActionAt);
    }
  }

  return lastActionAt;
}

function normalizeCareHistory(value: unknown): PetCareActionEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry: unknown): PetCareActionEntry => {
    const entryRecord = entry as Record<string, any>;

    return {
      id: String(entryRecord.id),
      actionId: isCareActionId(entryRecord.actionId) ? entryRecord.actionId : 'feed',
      appliedAt: dateToIso(entryRecord.appliedAt),
      statsBefore: normalizeStats(entryRecord.statsBefore as Partial<PetStats>),
      statsAfter: normalizeStats(entryRecord.statsAfter as Partial<PetStats>),
      careScoreBefore: Number(entryRecord.careScoreBefore),
      careScoreAfter: Number(entryRecord.careScoreAfter),
      moodBefore: normalizeMood(entryRecord.moodBefore),
      moodAfter: normalizeMood(entryRecord.moodAfter),
      isLightOnBefore: entryRecord.isLightOnBefore !== false,
      isLightOnAfter: entryRecord.isLightOnAfter !== false,
      awayUntilBefore: nullableDateToIso(entryRecord.awayUntilBefore),
      awayUntilAfter: nullableDateToIso(entryRecord.awayUntilAfter)
    };
  });
}

function petCoreData(pet: OwnedPet) {
  return {
    name: pet.name,
    petId: pet.petId,
    mode: pet.mode,
    status: pet.status,
    mood: pet.mood,
    periodOfLife: pet.periodOfLife,
    sessionLengthId: pet.sessionLengthId,
    createdAt: new Date(pet.createdAt),
    endsAt: new Date(pet.endsAt),
    lastResolvedAt: new Date(pet.lastResolvedAt),
    isLightOn: pet.isLightOn,
    awayUntil: dateOrNull(pet.awayUntil)
  };
}

function statsData(stats: PetStats) {
  return {
    satiety: stats.satiety,
    cleanliness: stats.cleanliness,
    happiness: stats.happiness,
    health: stats.health,
    energy: stats.energy
  };
}

function playerEnergyData(playerEnergy: PlayerEnergyState) {
  return {
    current: playerEnergy.current,
    max: playerEnergy.max,
    lastRecoveredAt: new Date(playerEnergy.lastRecoveredAt)
  };
}

function farewellData(pet: OwnedPet) {
  if (!pet.farewell) {
    throw new Error(`Pet ${pet.id} does not have a farewell result.`);
  }

  return {
    reason: pet.farewell.reason,
    farewellAt: new Date(pet.farewell.farewellAt),
    phraseId: pet.farewell.phraseId,
    finalCareScore: pet.farewell.finalCareScore,
    finalStats: { ...pet.farewell.finalStats }
  };
}

function careHistoryData(petId: string, entry: PetCareActionEntry): Prisma.PetCareActionUncheckedCreateInput {
  const action = PET_CARE_ACTIONS[entry.actionId];

  return {
    id: entry.id,
    petId,
    actionId: entry.actionId,
    activityType: action.activityType,
    appliedAt: new Date(entry.appliedAt),
    statsBefore: { ...entry.statsBefore },
    statsAfter: { ...entry.statsAfter },
    careScoreBefore: entry.careScoreBefore,
    careScoreAfter: entry.careScoreAfter,
    moodBefore: entry.moodBefore,
    moodAfter: entry.moodAfter,
    isLightOnBefore: entry.isLightOnBefore,
    isLightOnAfter: entry.isLightOnAfter,
    awayUntilBefore: dateOrNull(entry.awayUntilBefore),
    awayUntilAfter: dateOrNull(entry.awayUntilAfter),
    playerEnergyCost: action.playerEnergyCost,
    perceptionTags: [...action.perceptionTags]
  };
}

function dateOrNull(value: string | null): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function nullableDateToIso(value: unknown): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value as string | Date);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function dateToIso(value: unknown): string {
  const date = new Date(value as string | Date);
  return Number.isNaN(date.getTime()) ? new Date(0).toISOString() : date.toISOString();
}

function normalizePetId(value: unknown): PetId {
  if (value === 'dog' || value === 'parrot' || value === 'dinosaur' || value === 'dragon') {
    return value;
  }

  return 'cat';
}

function normalizePetMode(value: unknown): PetMode {
  if (value === 'medium' || value === 'insane') {
    return value;
  }

  return 'easy';
}

function normalizeStatus(value: unknown): PetStatus {
  if (value === 'grown' || value === 'left') {
    return value;
  }

  return 'pet';
}

function normalizeMood(value: unknown): PetMood {
  if (
    value === 'neutral' ||
    value === 'angry' ||
    value === 'upset' ||
    value === 'thoughtful' ||
    value === 'irritated'
  ) {
    return value;
  }

  return 'joyful';
}

function normalizePeriodOfLife(value: unknown): PetPeriodOfLife {
  if (value === 'child' || value === 'adult') {
    return value;
  }

  return 'teen';
}

function normalizeSessionLengthId(value: unknown): SessionLengthId {
  if (value === 'short' || value === 'long') {
    return value;
  }

  return 'standard';
}

function isCareActionId(value: unknown): value is PetCareActionId {
  return PET_CARE_ACTION_IDS.includes(value as PetCareActionId);
}
