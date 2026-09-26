import { GuestSession as GuestRecord, PetCareAction, Prisma } from '@prisma/client';
import { GuestSession, OwnedPet, PetCareActionEntry, PetCareActionId, PetStats } from './pet-domain.types';
import { createEmptyLastActionAt, PET_CARE_ACTION_IDS } from './pet-engine';
import { COAT_COLORS, COAT_PATTERNS } from './pet-appearance';

export const PET_SNAPSHOT_INCLUDE = {
  stats: true, playerEnergy: true, actionCooldowns: true, farewell: true
} satisfies Prisma.PetInclude;
type PetRecord = Prisma.PetGetPayload<{ include: typeof PET_SNAPSHOT_INCLUDE }>;
const MOODS: readonly OwnedPet['mood'][] = ['joyful', 'neutral', 'angry', 'upset', 'thoughtful', 'irritated'];

export class PetDataIntegrityError extends Error {
  constructor(field: string) { super(`Invalid persisted pet data: ${field}`); }
}

function enumValue<T extends string>(value: string, values: readonly T[], field: string): T {
  const found = values.find(candidate => candidate === value);
  if (found === undefined) throw new PetDataIntegrityError(field);
  return found;
}

function numberValue(value: unknown, field: string, max = 100): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > max) {
    throw new PetDataIntegrityError(field);
  }
  return value;
}

function statsValue(value: unknown, field: string): PetStats {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new PetDataIntegrityError(field);
  const stats = value as Record<string, unknown>;
  return {
    satiety: numberValue(stats['satiety'], `${field}.satiety`),
    cleanliness: numberValue(stats['cleanliness'], `${field}.cleanliness`),
    happiness: numberValue(stats['happiness'], `${field}.happiness`),
    health: numberValue(stats['health'], `${field}.health`),
    energy: numberValue(stats['energy'], `${field}.energy`)
  };
}

function iso(value: Date, field: string): string {
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) throw new PetDataIntegrityError(field);
  return value.toISOString();
}
function nullableIso(value: Date | null, field: string): string | null {
  return value === null ? null : iso(value, field);
}

export function toGuestSession(record: Pick<GuestRecord, 'id' | 'createdAt' | 'lastSeenAt'>): GuestSession {
  return { id: record.id, createdAt: iso(record.createdAt, 'guest.createdAt'), lastSeenAt: iso(record.lastSeenAt, 'guest.lastSeenAt') };
}

export function toOwnedPet(record: PetRecord): OwnedPet {
  const field = `Pet(${record.id})`;
  const status = enumValue<OwnedPet['status']>(record.status, ['pet', 'grown', 'left'], `${field}.status`);
  if (!record.playerEnergy) throw new PetDataIntegrityError(`${field}.playerEnergy`);
  if ((status === 'pet') !== (record.farewell === null)) throw new PetDataIntegrityError(`${field}.farewell/status`);
  const max = numberValue(record.playerEnergy.max, `${field}.playerEnergy.max`, Number.MAX_VALUE);
  if (max <= 0) throw new PetDataIntegrityError(`${field}.playerEnergy.max`);
  const lastActionAt = createEmptyLastActionAt();
  const seen = new Set<PetCareActionId>();
  for (const cooldown of record.actionCooldowns) {
    const actionId = enumValue(cooldown.actionId, PET_CARE_ACTION_IDS, `${field}.cooldown.actionId`);
    if (seen.has(actionId)) throw new PetDataIntegrityError(`${field}.cooldown.duplicate`);
    seen.add(actionId);
    lastActionAt[actionId] = nullableIso(cooldown.lastActionAt, `${field}.cooldown.lastActionAt`);
  }
  if (seen.size !== PET_CARE_ACTION_IDS.length) throw new PetDataIntegrityError(`${field}.cooldown.missing`);
  const careHistoryCount = numberValue(record.careHistoryCount, `${field}.careHistoryCount`, Number.MAX_SAFE_INTEGER);
  if (!Number.isInteger(careHistoryCount)) throw new PetDataIntegrityError(`${field}.careHistoryCount`);
  return {
    id: record.id, name: record.name,
    appearance: {
      color: enumValue(record.coatColor, COAT_COLORS, field + '.coatColor'),
      pattern: enumValue(record.coatPattern, COAT_PATTERNS, field + '.coatPattern')
    },
    petId: enumValue<OwnedPet['petId']>(record.petId, ['cat', 'dog', 'parrot', 'dinosaur', 'dragon'], `${field}.petId`),
    mode: enumValue<OwnedPet['mode']>(record.mode, ['easy', 'medium', 'insane'], `${field}.mode`),
    status,
    mood: enumValue(record.mood, MOODS, `${field}.mood`),
    periodOfLife: enumValue<OwnedPet['periodOfLife']>(record.periodOfLife, ['child', 'teen', 'adult'], `${field}.periodOfLife`),
    sessionLengthId: enumValue<OwnedPet['sessionLengthId']>(record.sessionLengthId, ['short', 'standard', 'long'], `${field}.sessionLengthId`),
    stats: statsValue(record.stats, `${field}.stats`),
    trust: numberValue(record.trust, `${field}.trust`),
    createdAt: iso(record.createdAt, `${field}.createdAt`),
    endsAt: iso(record.endsAt, `${field}.endsAt`),
    lastResolvedAt: iso(record.lastResolvedAt, `${field}.lastResolvedAt`),
    playerEnergy: {
      current: numberValue(record.playerEnergy.current, `${field}.playerEnergy.current`, max), max,
      lastRecoveredAt: iso(record.playerEnergy.lastRecoveredAt, `${field}.playerEnergy.lastRecoveredAt`)
    },
    lastActionAt, isLightOn: record.isLightOn, awayUntil: nullableIso(record.awayUntil, `${field}.awayUntil`),
    careHistoryCount,
    farewell: record.farewell ? {
      reason: enumValue<NonNullable<OwnedPet['farewell']>['reason']>(record.farewell.reason, ['grown-up', 'lack-of-care'], `${field}.farewell.reason`),
      phraseId: enumValue<NonNullable<OwnedPet['farewell']>['phraseId']>(record.farewell.phraseId, ['bright-future', 'ready-for-adventure', 'needed-more-care'], `${field}.farewell.phraseId`),
      farewellAt: iso(record.farewell.farewellAt, `${field}.farewell.farewellAt`),
      finalCareScore: numberValue(record.farewell.finalCareScore, `${field}.farewell.finalCareScore`),
      finalStats: statsValue(record.farewell.finalStats, `${field}.farewell.finalStats`)
    } : null
  };
}

export function toCareHistoryEntry(record: PetCareAction): PetCareActionEntry {
  const field = `PetCareAction(${record.id})`;
  return {
    id: record.id, actionId: enumValue(record.actionId, PET_CARE_ACTION_IDS, `${field}.actionId`),
    appliedAt: iso(record.appliedAt, `${field}.appliedAt`),
    statsBefore: statsValue(record.statsBefore, `${field}.statsBefore`),
    statsAfter: statsValue(record.statsAfter, `${field}.statsAfter`),
    careScoreBefore: numberValue(record.careScoreBefore, `${field}.careScoreBefore`),
    careScoreAfter: numberValue(record.careScoreAfter, `${field}.careScoreAfter`),
    moodBefore: enumValue(record.moodBefore, MOODS, `${field}.moodBefore`),
    moodAfter: enumValue(record.moodAfter, MOODS, `${field}.moodAfter`),
    isLightOnBefore: record.isLightOnBefore, isLightOnAfter: record.isLightOnAfter,
    awayUntilBefore: nullableIso(record.awayUntilBefore, `${field}.awayUntilBefore`),
    awayUntilAfter: nullableIso(record.awayUntilAfter, `${field}.awayUntilAfter`)
  };
}
