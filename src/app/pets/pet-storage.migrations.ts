import { PetId, PetMode, SessionLengthId } from '../pocket-pet/pocket-pet.model';
import {
  careScore,
  createEmptyLastActionAt,
  DEFAULT_PET_STATS,
  normalizeStats,
  resolvePetState
} from './pet-engine';
import {
  OwnedPet,
  PetCareActionEntry,
  PetCareActionId,
  PetFarewellPhraseId,
  PetFarewellReason,
  PetFarewellResult,
  PetLastActionAt,
  PetMood,
  PetPeriodOfLife,
  PetStatus,
  PetStats
} from './owned-pet.model';

export const PET_STORAGE_VERSION = '0.4.0';

const PREVIOUS_STORAGE_VERSIONS = ['0.3.0', '0.2.0'] as const;
const LEGACY_STORAGE_VERSION = '0.1.1';

interface StoredPets {
  version: string;
  pets: Partial<OwnedPet>[];
}

export function deserializePets(rawPets: string | null, now: Date = new Date()): OwnedPet[] {
  if (!rawPets) {
    return [];
  }

  try {
    const parsedPets = JSON.parse(rawPets) as Partial<StoredPets>;

    if (!Array.isArray(parsedPets.pets)) {
      return [];
    }

    if (
      parsedPets.version === PET_STORAGE_VERSION ||
      PREVIOUS_STORAGE_VERSIONS.some((version: string): boolean => version === parsedPets.version)
    ) {
      return parsedPets.pets.map((pet: Partial<OwnedPet>): OwnedPet => normalizePet(pet, now, false));
    }

    if (parsedPets.version === LEGACY_STORAGE_VERSION) {
      return parsedPets.pets.map((pet: Partial<OwnedPet>): OwnedPet => normalizePet(pet, now, true));
    }

    return [];
  } catch {
    return [];
  }
}

export function serializePets(pets: readonly OwnedPet[]): string {
  return JSON.stringify({
    version: PET_STORAGE_VERSION,
    pets
  });
}

function normalizePet(pet: Partial<OwnedPet>, now: Date, isLegacyPet: boolean): OwnedPet {
  const nowIso = now.toISOString();
  const createdAt = normalizeDate(pet.createdAt, nowIso);
  const endsAt = normalizeDate(pet.endsAt, createdAt);
  const stats = isLegacyPet ? { ...DEFAULT_PET_STATS } : normalizeStoredStats(pet.stats);
  const lastResolvedAt = isLegacyPet ? nowIso : normalizeDate(pet.lastResolvedAt, createdAt);
  const status = normalizeStatus(pet.status);

  return resolvePetState({
    id: pet.id ?? `pet-${now.getTime()}`,
    name: pet.name?.trim() || 'Pocket Pet',
    petId: normalizePetId(pet.petId),
    mode: normalizePetMode(pet.mode),
    status,
    mood: normalizeMood(pet.mood),
    periodOfLife: normalizePeriodOfLife(pet.periodOfLife),
    stats,
    sessionLengthId: normalizeSessionLengthId(pet.sessionLengthId),
    createdAt,
    endsAt,
    lastResolvedAt,
    lastActionAt: normalizeLastActionAt(pet.lastActionAt),
    isLightOn: normalizeLight(pet.isLightOn),
    awayUntil: normalizeNullableDate(pet.awayUntil),
    careHistory: normalizeCareHistory(pet.careHistory),
    farewell: normalizeFarewell(pet.farewell)
  }, now);
}

function normalizeStoredStats(stats: Partial<PetStats> | undefined): PetStats {
  return normalizeStats(stats, DEFAULT_PET_STATS);
}

function normalizeLastActionAt(lastActionAt: Partial<PetLastActionAt> | undefined): PetLastActionAt {
  const fallback = createEmptyLastActionAt();

  return {
    feed: normalizeNullableDate(lastActionAt?.feed) ?? fallback.feed,
    junkFood: normalizeNullableDate(lastActionAt?.junkFood) ?? fallback.junkFood,
    clean: normalizeNullableDate(lastActionAt?.clean) ?? fallback.clean,
    play: normalizeNullableDate(lastActionAt?.play) ?? fallback.play,
    walk: normalizeNullableDate(lastActionAt?.walk) ?? fallback.walk,
    toggleLight: normalizeNullableDate(lastActionAt?.toggleLight) ?? fallback.toggleLight
  };
}

function normalizeCareHistory(careHistory: Partial<PetCareActionEntry>[] | undefined): PetCareActionEntry[] {
  if (!Array.isArray(careHistory)) {
    return [];
  }

  return careHistory
    .map((entry: Partial<PetCareActionEntry>, index: number): PetCareActionEntry | null =>
      normalizeCareHistoryEntry(entry, index)
    )
    .filter((entry: PetCareActionEntry | null): entry is PetCareActionEntry => entry !== null);
}

function normalizeCareHistoryEntry(entry: Partial<PetCareActionEntry>, index: number): PetCareActionEntry | null {
  const actionId = normalizeCareActionId(entry.actionId);
  const appliedAt = normalizeNullableDate(entry.appliedAt);

  if (!actionId || !appliedAt) {
    return null;
  }

  const statsBefore = normalizeStoredStats(entry.statsBefore);
  const statsAfter = normalizeStoredStats(entry.statsAfter);

  return {
    id: entry.id?.trim() || `${actionId}-${Date.parse(appliedAt)}-${index + 1}`,
    actionId,
    appliedAt,
    statsBefore,
    statsAfter,
    careScoreBefore: normalizeScore(entry.careScoreBefore, careScore(statsBefore)),
    careScoreAfter: normalizeScore(entry.careScoreAfter, careScore(statsAfter)),
    moodBefore: normalizeMood(entry.moodBefore),
    moodAfter: normalizeMood(entry.moodAfter),
    isLightOnBefore: normalizeLight(entry.isLightOnBefore),
    isLightOnAfter: normalizeLight(entry.isLightOnAfter),
    awayUntilBefore: normalizeNullableDate(entry.awayUntilBefore),
    awayUntilAfter: normalizeNullableDate(entry.awayUntilAfter)
  };
}

function normalizeFarewell(farewell: Partial<PetFarewellResult> | null | undefined): PetFarewellResult | null {
  if (!farewell) {
    return null;
  }

  const reason = normalizeFarewellReason(farewell.reason);
  const farewellAt = normalizeNullableDate(farewell.farewellAt);

  if (!reason || !farewellAt) {
    return null;
  }

  const finalStats = normalizeStoredStats(farewell.finalStats);
  const finalCareScore = normalizeScore(farewell.finalCareScore, careScore(finalStats));

  return {
    reason,
    farewellAt,
    phraseId: normalizeFarewellPhraseId(farewell.phraseId, reason, finalCareScore),
    finalCareScore,
    finalStats
  };
}

function normalizeStatus(status: PetStatus | 'active' | 'resting' | 'needs-care' | undefined): PetStatus {
  if (status === 'grown' || status === 'left') {
    return status;
  }

  return 'pet';
}

function normalizeMood(mood: PetMood | undefined): PetMood {
  if (mood === 'neutral' || mood === 'angry' || mood === 'upset' || mood === 'thoughtful' || mood === 'irritated') {
    return mood;
  }

  return 'joyful';
}

function normalizeCareActionId(actionId: PetCareActionId | undefined): PetCareActionId | null {
  if (
    actionId === 'feed' ||
    actionId === 'junkFood' ||
    actionId === 'clean' ||
    actionId === 'play' ||
    actionId === 'walk' ||
    actionId === 'toggleLight'
  ) {
    return actionId;
  }

  return null;
}

function normalizeLight(isLightOn: boolean | undefined): boolean {
  return isLightOn !== false;
}

function normalizeFarewellReason(reason: PetFarewellReason | undefined): PetFarewellReason | null {
  if (reason === 'grown-up' || reason === 'lack-of-care') {
    return reason;
  }

  return null;
}

function normalizeFarewellPhraseId(
  phraseId: PetFarewellPhraseId | undefined,
  reason: PetFarewellReason,
  finalCareScore: number
): PetFarewellPhraseId {
  if (phraseId === 'bright-future' || phraseId === 'ready-for-adventure' || phraseId === 'needed-more-care') {
    return phraseId;
  }

  if (reason === 'lack-of-care') {
    return 'needed-more-care';
  }

  return finalCareScore >= 80 ? 'bright-future' : 'ready-for-adventure';
}

function normalizePeriodOfLife(periodOfLife: PetPeriodOfLife | undefined): PetPeriodOfLife {
  if (periodOfLife === 'child' || periodOfLife === 'adult') {
    return periodOfLife;
  }

  return 'teen';
}

function normalizePetId(petId: PetId | undefined): PetId {
  if (petId === 'dog' || petId === 'parrot' || petId === 'dinosaur' || petId === 'dragon') {
    return petId;
  }

  return 'cat';
}

function normalizePetMode(mode: PetMode | undefined): PetMode {
  if (mode === 'medium' || mode === 'insane') {
    return mode;
  }

  return 'easy';
}

function normalizeSessionLengthId(sessionLengthId: SessionLengthId | undefined): SessionLengthId {
  if (sessionLengthId === 'short' || sessionLengthId === 'long') {
    return sessionLengthId;
  }

  return 'standard';
}

function normalizeDate(value: string | undefined, fallback: string): string {
  if (!value || Number.isNaN(Date.parse(value))) {
    return fallback;
  }

  return value;
}

function normalizeNullableDate(value: string | null | undefined): string | null {
  if (!value || Number.isNaN(Date.parse(value))) {
    return null;
  }

  return value;
}

function normalizeScore(value: number | undefined, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return fallback;
  }

  return Math.round(Math.max(0, Math.min(100, value)) * 10) / 10;
}
