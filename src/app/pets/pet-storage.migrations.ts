import { PetId, PetMode, SessionLengthId } from '../pocket-pet/pocket-pet.model';
import {
  createEmptyLastActionAt,
  DEFAULT_PET_STATS,
  normalizeStats,
  resolvePetState
} from './pet-engine';
import {
  OwnedPet,
  PetLastActionAt,
  PetMood,
  PetPeriodOfLife,
  PetStatus,
  PetStats
} from './owned-pet.model';

export const PET_STORAGE_VERSION = '0.2.0';

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

    if (parsedPets.version === PET_STORAGE_VERSION) {
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

  return resolvePetState({
    id: pet.id ?? `pet-${now.getTime()}`,
    name: pet.name?.trim() || 'Pocket Pet',
    petId: normalizePetId(pet.petId),
    mode: normalizePetMode(pet.mode),
    status: normalizeStatus(pet.status),
    mood: normalizeMood(pet.mood),
    periodOfLife: normalizePeriodOfLife(pet.periodOfLife),
    stats,
    sessionLengthId: normalizeSessionLengthId(pet.sessionLengthId),
    createdAt,
    endsAt,
    lastResolvedAt,
    lastActionAt: normalizeLastActionAt(pet.lastActionAt)
  }, now);
}

function normalizeStoredStats(stats: Partial<PetStats> | undefined): PetStats {
  return normalizeStats(stats, DEFAULT_PET_STATS);
}

function normalizeLastActionAt(lastActionAt: Partial<PetLastActionAt> | undefined): PetLastActionAt {
  const fallback = createEmptyLastActionAt();

  return {
    feed: normalizeNullableDate(lastActionAt?.feed) ?? fallback.feed,
    clean: normalizeNullableDate(lastActionAt?.clean) ?? fallback.clean,
    play: normalizeNullableDate(lastActionAt?.play) ?? fallback.play
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
