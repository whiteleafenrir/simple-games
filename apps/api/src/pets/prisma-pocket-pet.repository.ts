import { Injectable } from '@nestjs/common';

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
import { PocketPetRepository } from './pocket-pet.repository';

@Injectable()
export class PrismaPocketPetRepository implements PocketPetRepository {
  constructor(private readonly prisma: PrismaService) {}

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

  async listPets(guestId: string): Promise<OwnedPet[]> {
    const records = await this.prismaClient().pet.findMany({
      where: {
        guestSessionId: guestId
      },
      include: petInclude(),
      orderBy: {
        createdAt: 'desc'
      }
    });

    return records.map((record: unknown): OwnedPet => toOwnedPet(record));
  }

  async getPet(guestId: string, petId: string): Promise<OwnedPet | null> {
    const record = await this.prismaClient().pet.findFirst({
      where: {
        id: petId,
        guestSessionId: guestId
      },
      include: petInclude()
    });

    return record ? toOwnedPet(record) : null;
  }

  async createPet(guestId: string, pet: OwnedPet): Promise<OwnedPet> {
    const client = this.prismaClient();

    await client.$transaction(async (tx: Record<string, any>): Promise<void> => {
      await tx.pet.create({
        data: {
          id: pet.id,
          guestSessionId: guestId,
          ...petCoreData(pet)
        }
      });
      await tx.petStats.create({
        data: {
          petId: pet.id,
          ...statsData(pet.stats)
        }
      });
      await tx.playerEnergy.create({
        data: {
          petId: pet.id,
          ...playerEnergyData(pet.playerEnergy)
        }
      });

      for (const actionId of PET_CARE_ACTION_IDS) {
        await tx.petActionCooldown.create({
          data: {
            petId: pet.id,
            actionId,
            lastActionAt: dateOrNull(pet.lastActionAt[actionId])
          }
        });
      }
    });

    const createdPet = await this.getPet(guestId, pet.id);

    if (!createdPet) {
      throw new Error(`Pet ${pet.id} was not persisted.`);
    }

    return createdPet;
  }

  async savePet(guestId: string, pet: OwnedPet): Promise<OwnedPet> {
    const client = this.prismaClient();

    await client.$transaction(async (tx: Record<string, any>): Promise<void> => {
      const existingPet = await tx.pet.findFirst({
        where: {
          id: pet.id,
          guestSessionId: guestId
        }
      });

      if (!existingPet) {
        throw new Error(`Pet ${pet.id} does not belong to guest session ${guestId}.`);
      }

      await tx.pet.update({
        where: {
          id: pet.id
        },
        data: petCoreData(pet)
      });
      await tx.petStats.upsert({
        where: {
          petId: pet.id
        },
        update: statsData(pet.stats),
        create: {
          petId: pet.id,
          ...statsData(pet.stats)
        }
      });
      await tx.playerEnergy.upsert({
        where: {
          petId: pet.id
        },
        update: playerEnergyData(pet.playerEnergy),
        create: {
          petId: pet.id,
          ...playerEnergyData(pet.playerEnergy)
        }
      });

      for (const actionId of PET_CARE_ACTION_IDS) {
        await tx.petActionCooldown.upsert({
          where: {
            petId_actionId: {
              petId: pet.id,
              actionId
            }
          },
          update: {
            lastActionAt: dateOrNull(pet.lastActionAt[actionId])
          },
          create: {
            petId: pet.id,
            actionId,
            lastActionAt: dateOrNull(pet.lastActionAt[actionId])
          }
        });
      }

      if (pet.farewell) {
        await tx.petFarewellResult.upsert({
          where: {
            petId: pet.id
          },
          update: farewellData(pet),
          create: {
            petId: pet.id,
            ...farewellData(pet)
          }
        });
      } else {
        await tx.petFarewellResult.deleteMany({
          where: {
            petId: pet.id
          }
        });
      }

      if (pet.careHistory.length > 0) {
        await tx.petCareAction.createMany({
          data: pet.careHistory.map((entry: PetCareActionEntry): Record<string, unknown> => careHistoryData(pet.id, entry)),
          skipDuplicates: true
        });
      }
    });

    const savedPet = await this.getPet(guestId, pet.id);

    if (!savedPet) {
      throw new Error(`Pet ${pet.id} was not persisted.`);
    }

    return savedPet;
  }

  private prismaClient(): Record<string, any> {
    return this.prisma as unknown as Record<string, any>;
  }
}

function petInclude(): Record<string, unknown> {
  return {
    stats: true,
    playerEnergy: true,
    actionCooldowns: true,
    careHistory: {
      orderBy: {
        appliedAt: 'asc'
      }
    },
    farewell: true
  };
}

function toGuestSession(record: Record<string, Date | string>): GuestSession {
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

function petCoreData(pet: OwnedPet): Record<string, unknown> {
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

function statsData(stats: PetStats): Record<string, number> {
  return {
    satiety: stats.satiety,
    cleanliness: stats.cleanliness,
    happiness: stats.happiness,
    health: stats.health,
    energy: stats.energy
  };
}

function playerEnergyData(playerEnergy: PlayerEnergyState): Record<string, unknown> {
  return {
    current: playerEnergy.current,
    max: playerEnergy.max,
    lastRecoveredAt: new Date(playerEnergy.lastRecoveredAt)
  };
}

function farewellData(pet: OwnedPet): Record<string, unknown> {
  if (!pet.farewell) {
    throw new Error(`Pet ${pet.id} does not have a farewell result.`);
  }

  return {
    reason: pet.farewell.reason,
    farewellAt: new Date(pet.farewell.farewellAt),
    phraseId: pet.farewell.phraseId,
    finalCareScore: pet.farewell.finalCareScore,
    finalStats: pet.farewell.finalStats
  };
}

function careHistoryData(petId: string, entry: PetCareActionEntry): Record<string, unknown> {
  const action = PET_CARE_ACTIONS[entry.actionId];

  return {
    id: entry.id,
    petId,
    actionId: entry.actionId,
    activityType: action.activityType,
    appliedAt: new Date(entry.appliedAt),
    statsBefore: entry.statsBefore,
    statsAfter: entry.statsAfter,
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
