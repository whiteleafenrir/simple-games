import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { isDeepStrictEqual } from 'node:util';
import { PrismaService } from '../prisma/prisma.service';
import { GuestSession, OwnedPet, PetCareActionEntry, PetHistoryCursor, PetStats, PlayerEnergyState } from './pet-domain.types';
import { PET_CARE_ACTIONS, PET_CARE_ACTION_IDS } from './pet-engine';
import { ActivePetConflictError, GuestSessionNotFoundError, PocketPetRepository, PocketPetTransaction } from './pocket-pet.repository';
import { PET_SNAPSHOT_INCLUDE, toGuestSession, toOwnedPet, toCareHistoryEntry } from './pet-record.mapper';
import { StoredQuestionAttempt, toStoredQuestion } from './pet-question-attempt';

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


// Only constructed after locking the guest; all reads and writes share the transaction.
class PrismaPetTransaction implements PocketPetTransaction {
  private readonly snapshots = new Map<string, OwnedPet>();
  constructor(private readonly tx: Prisma.TransactionClient, private readonly guestId: string) {}

  async touchGuestSession(now: Date): Promise<void> {
    await this.tx.guestSession.update({ where: { id: this.guestId }, data: { lastSeenAt: now } });
  }

  async listPets(): Promise<OwnedPet[]> {
    const records = await this.tx.pet.findMany({
      where: { guestSessionId: this.guestId }, include: PET_SNAPSHOT_INCLUDE,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }]
    });
    return records.map(record => this.remember(toOwnedPet(record)));
  }

  async getPet(petId: string): Promise<OwnedPet | null> {
    const record = await this.tx.pet.findFirst({
      where: { id: petId, guestSessionId: this.guestId }, include: PET_SNAPSHOT_INCLUDE
    });
    return record ? this.remember(toOwnedPet(record)) : null;
  }

  async listHistory(petId: string, cursor: PetHistoryCursor | null, limit: number): Promise<PetCareActionEntry[]> {
    const records = await this.tx.petCareAction.findMany({
      where: {
        petId, pet: { guestSessionId: this.guestId },
        ...(cursor ? { OR: [
          { appliedAt: { lt: new Date(cursor.appliedAt) } },
          { appliedAt: new Date(cursor.appliedAt), id: { lt: cursor.id } }
        ] } : {})
      },
      orderBy: [{ appliedAt: 'desc' }, { id: 'desc' }], take: limit
    });
    return records.map(toCareHistoryEntry);
  }

  async createPet(pet: OwnedPet): Promise<OwnedPet> {
    if (pet.careHistoryCount !== 0) throw new Error('A new pet cannot have history.');
    const record = await this.tx.pet.create({
      data: {
        id: pet.id, guestSessionId: this.guestId, ...petCoreData(pet),
        stats: { create: statsData(pet.stats) },
        playerEnergy: { create: playerEnergyData(pet.playerEnergy) },
        actionCooldowns: { create: PET_CARE_ACTION_IDS.map(actionId => ({
          actionId, lastActionAt: dateOrNull(pet.lastActionAt[actionId])
        })) },
        ...(pet.farewell ? { farewell: { create: farewellData(pet) } } : {})
      }, include: PET_SNAPSHOT_INCLUDE
    });
    return this.remember(toOwnedPet(record));
  }

  async savePet(pet: OwnedPet, entry: PetCareActionEntry | null = null): Promise<OwnedPet> {
    const previous = this.snapshots.get(pet.id) ?? await this.getPet(pet.id);
    if (!previous) throw new Error('Pet does not belong to the transaction guest.');
    let added = 0;
    if (entry) {
      const existing = await this.tx.petCareAction.findUnique({ where: { id: entry.id } });
      if (existing) {
        if (existing.petId !== pet.id || !isDeepStrictEqual(toCareHistoryEntry(existing), entry)) {
          throw new Error('Care history event conflicts with its persisted owner or content.');
        }
      } else {
        await this.tx.petCareAction.create({ data: careHistoryData(pet.id, entry) });
        added = 1;
      }
    }
    if (pet.careHistoryCount !== previous.careHistoryCount + added) {
      throw new Error('Care history count does not match appended events.');
    }
    if (!isDeepStrictEqual(petCoreData(previous), petCoreData(pet))) {
      await this.tx.pet.update({ where: { id: pet.id, guestSessionId: this.guestId }, data: petCoreData(pet) });
    }
    if (!isDeepStrictEqual(previous.stats, pet.stats)) {
      await this.tx.petStats.update({ where: { petId: pet.id }, data: statsData(pet.stats) });
    }
    if (!isDeepStrictEqual(previous.playerEnergy, pet.playerEnergy)) {
      await this.tx.playerEnergy.update({ where: { petId: pet.id }, data: playerEnergyData(pet.playerEnergy) });
    }
    for (const actionId of PET_CARE_ACTION_IDS) {
      if (previous.lastActionAt[actionId] !== pet.lastActionAt[actionId]) {
        await this.tx.petActionCooldown.update({
          where: { petId_actionId: { petId: pet.id, actionId } },
          data: { lastActionAt: dateOrNull(pet.lastActionAt[actionId]) }
        });
      }
    }
    if (!isDeepStrictEqual(previous.farewell, pet.farewell)) {
      if (previous.farewell) throw new Error('A persisted farewell is immutable.');
      if (pet.farewell) await this.tx.petFarewellResult.create({ data: { petId: pet.id, ...farewellData(pet) } });
    }
    return this.remember(pet);
  }

  private remember(pet: OwnedPet): OwnedPet {
    this.snapshots.set(pet.id, structuredClone(pet));
    return pet;
  }

  async latestQuestion(petId: string): Promise<StoredQuestionAttempt | null> {
    const record = await this.tx.petQuestionAttempt.findFirst({
      where: { petId, pet: { guestSessionId: this.guestId } }, orderBy: [{ issuedAt: 'desc' }, { id: 'desc' }]
    });
    return record ? toStoredQuestion(record) : null;
  }

  async getQuestion(petId: string, attemptId: string): Promise<StoredQuestionAttempt | null> {
    const record = await this.tx.petQuestionAttempt.findFirst({ where: { id: attemptId, petId, pet: { guestSessionId: this.guestId } } });
    return record ? toStoredQuestion(record) : null;
  }

  async askedQuestionIds(petId: string): Promise<string[]> {
    const records = await this.tx.petQuestionAttempt.findMany({
      where: { petId, pet: { guestSessionId: this.guestId } }, select: { questionId: true }, distinct: ['questionId']
    });
    return records.map(record => record.questionId);
  }

  async saveQuestion(attempt: StoredQuestionAttempt): Promise<void> {
    if (!this.snapshots.has(attempt.petId) && !await this.getPet(attempt.petId)) throw new Error('Question pet does not belong to guest.');
    const previous = await this.getQuestion(attempt.petId, attempt.id);
    if (previous?.completedAt) {
      if (!isDeepStrictEqual(previous, attempt)) throw new Error('A completed question is immutable.');
      return;
    }
    const { definition, issuedAt, completedAt, ...fields } = attempt;
    const data = {
      ...fields, issuedAt: new Date(issuedAt), completedAt: completedAt ? new Date(completedAt) : null,
      definition: { ...definition, content: { ru: { ...definition.content.ru }, en: { ...definition.content.en } } }
    } satisfies Prisma.PetQuestionAttemptUncheckedCreateInput;
    if (previous) {
      await this.tx.petQuestionAttempt.update({ where: { id: attempt.id, petId: attempt.petId, completedAt: null }, data });
    } else {
      await this.tx.petQuestionAttempt.create({ data });
    }
  }

  async questionHistory(petId: string, cursor: PetHistoryCursor | null, limit: number): Promise<StoredQuestionAttempt[]> {
    const records = await this.tx.petQuestionAttempt.findMany({
      where: {
        petId, pet: { guestSessionId: this.guestId }, completedAt: { not: null },
        ...(cursor ? { OR: [
          { completedAt: { lt: new Date(cursor.appliedAt) } },
          { completedAt: new Date(cursor.appliedAt), id: { lt: cursor.id } }
        ] } : {})
      }, orderBy: [{ completedAt: 'desc' }, { id: 'desc' }], take: limit
    });
    return records.map(toStoredQuestion);
  }
}

function petCoreData(pet: OwnedPet) {
  return {
    careHistoryCount: pet.careHistoryCount,
    trust: pet.trust,
    name: pet.name,
    coatColor: pet.appearance.color,
    coatPattern: pet.appearance.pattern,
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
