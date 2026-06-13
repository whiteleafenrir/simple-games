import { PetMode } from '../pocket-pet/pocket-pet.model';
import {
  OwnedPet,
  PetCareActionEntry,
  PetCareActionId,
  PetCareActionResult,
  PetFarewellPhraseId,
  PetFarewellReason,
  PetFarewellResult,
  PetLastActionAt,
  PetMood,
  PetPeriodOfLife,
  PetStats,
  PetStatus
} from './owned-pet.model';

const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

type PetStatDelta = Partial<Record<keyof PetStats, number>>;

interface PetCareActionConfig {
  id: PetCareActionId;
  cooldownMinutes: number;
  statChanges: PetStatDelta;
}

export const PET_CARE_ACTION_IDS: readonly PetCareActionId[] = ['feed', 'clean', 'play'] as const;

export const DEFAULT_PET_STATS: PetStats = {
  satiety: 80,
  cleanliness: 80,
  happiness: 80
};

export const PET_CARE_ACTIONS: Record<PetCareActionId, PetCareActionConfig> = {
  feed: {
    id: 'feed',
    cooldownMinutes: 10,
    statChanges: {
      satiety: 35,
      cleanliness: -5,
      happiness: 5
    }
  },
  clean: {
    id: 'clean',
    cooldownMinutes: 10,
    statChanges: {
      cleanliness: 40,
      happiness: -3
    }
  },
  play: {
    id: 'play',
    cooldownMinutes: 15,
    statChanges: {
      happiness: 30,
      satiety: -12,
      cleanliness: -8
    }
  }
};

export function createEmptyLastActionAt(): PetLastActionAt {
  return {
    feed: null,
    clean: null,
    play: null
  };
}

export function createInitialPetCareState(
  now: Date = new Date()
): Pick<OwnedPet, 'stats' | 'lastResolvedAt' | 'lastActionAt' | 'careHistory' | 'farewell'> {
  return {
    stats: { ...DEFAULT_PET_STATS },
    lastResolvedAt: now.toISOString(),
    lastActionAt: createEmptyLastActionAt(),
    careHistory: [],
    farewell: null
  };
}

export function resolvePetState(pet: OwnedPet, now: Date = new Date()): OwnedPet {
  const nowMs = now.getTime();
  const createdAtMs = safeTime(pet.createdAt, nowMs);
  const endsAtMs = Math.max(createdAtMs, safeTime(pet.endsAt, nowMs));
  const periodOfLife = petPeriodOfLife(createdAtMs, endsAtMs, Math.min(nowMs, endsAtMs));

  if (pet.status !== 'pet') {
    const stats = normalizeStats(pet.stats);
    return {
      ...pet,
      mood: petMood(stats),
      periodOfLife,
      stats,
      farewell: pet.farewell ?? createFarewellResult(pet.status, stats, new Date(endsAtMs))
    };
  }

  const lastResolvedMs = safeTime(pet.lastResolvedAt, createdAtMs);
  const resolveUntilMs = Math.min(nowMs, endsAtMs);
  const elapsedHours = Math.max(0, resolveUntilMs - Math.min(lastResolvedMs, resolveUntilMs)) / HOUR_MS;
  const stats = elapsedHours > 0 ? decayStats(pet.stats, elapsedHours, pet.mode) : normalizeStats(pet.stats);
  const status = petStatus(stats, nowMs, endsAtMs);
  const farewell = status === 'pet' ? null : createFarewellResult(status, stats, new Date(endsAtMs));

  return {
    ...pet,
    status,
    mood: petMood(stats),
    periodOfLife,
    stats,
    farewell,
    lastResolvedAt: now.toISOString()
  };
}

export function applyPetCareAction(
  pet: OwnedPet,
  actionId: PetCareActionId,
  now: Date = new Date()
): PetCareActionResult {
  const resolvedPet = resolvePetState(pet, now);
  const nextAvailableAt = careActionNextAvailableAt(resolvedPet, actionId);

  if (resolvedPet.status !== 'pet') {
    return {
      pet: resolvedPet,
      actionId,
      applied: false,
      reason: 'inactive',
      nextAvailableAt: nextAvailableAt?.toISOString() ?? null
    };
  }

  if (nextAvailableAt && nextAvailableAt.getTime() > now.getTime()) {
    return {
      pet: resolvedPet,
      actionId,
      applied: false,
      reason: 'cooldown',
      nextAvailableAt: nextAvailableAt.toISOString()
    };
  }

  const action = PET_CARE_ACTIONS[actionId];
  const statsBefore = normalizeStats(resolvedPet.stats);
  const statsAfter = applyStatChanges(statsBefore, action.statChanges);
  const changedPet: OwnedPet = {
    ...resolvedPet,
    stats: statsAfter,
    lastResolvedAt: now.toISOString(),
    lastActionAt: {
      ...resolvedPet.lastActionAt,
      [actionId]: now.toISOString()
    },
    careHistory: [
      ...resolvedPet.careHistory,
      createCareActionEntry(resolvedPet, actionId, now, statsBefore, statsAfter)
    ]
  };
  const nextPet = resolvePetState(changedPet, now);

  return {
    pet: nextPet,
    actionId,
    applied: true,
    reason: null,
    nextAvailableAt: new Date(now.getTime() + action.cooldownMinutes * MINUTE_MS).toISOString()
  };
}

export function careActionCooldownRemainingMs(pet: OwnedPet, actionId: PetCareActionId, now: Date = new Date()): number {
  const nextAvailableAt = careActionNextAvailableAt(pet, actionId);

  if (!nextAvailableAt) {
    return 0;
  }

  return Math.max(0, nextAvailableAt.getTime() - now.getTime());
}

export function careScore(stats: PetStats): number {
  return roundStat((stats.satiety + stats.cleanliness + stats.happiness) / 3);
}

export function petMood(stats: PetStats): PetMood {
  const normalizedStats = normalizeStats(stats);
  const minimum = Math.min(normalizedStats.satiety, normalizedStats.cleanliness, normalizedStats.happiness);

  if (normalizedStats.satiety >= 75 && normalizedStats.cleanliness >= 75 && normalizedStats.happiness >= 75) {
    return 'joyful';
  }

  if (normalizedStats.satiety < 25) {
    return 'angry';
  }

  if (normalizedStats.cleanliness < 25) {
    return 'irritated';
  }

  if (normalizedStats.happiness < 25) {
    return 'upset';
  }

  if (minimum < 45) {
    return 'thoughtful';
  }

  if (careScore(normalizedStats) >= 60) {
    return 'neutral';
  }

  return 'thoughtful';
}

export function petPeriodOfLife(createdAtMs: number, endsAtMs: number, referenceMs: number): PetPeriodOfLife {
  const durationMs = endsAtMs - createdAtMs;

  if (durationMs <= 0) {
    return 'adult';
  }

  const progress = Math.max(0, Math.min(1, (referenceMs - createdAtMs) / durationMs));

  if (progress < 0.2) {
    return 'child';
  }

  if (progress < 0.7) {
    return 'teen';
  }

  return 'adult';
}

export function normalizeStats(stats: Partial<PetStats> | undefined, fallback: PetStats = DEFAULT_PET_STATS): PetStats {
  return {
    satiety: normalizeStat(stats?.satiety, fallback.satiety),
    cleanliness: normalizeStat(stats?.cleanliness, fallback.cleanliness),
    happiness: normalizeStat(stats?.happiness, fallback.happiness)
  };
}

function decayStats(stats: PetStats, elapsedHours: number, mode: PetMode): PetStats {
  const multiplier = modeDecayMultiplier(mode);

  return normalizeStats({
    satiety: stats.satiety - 3 * multiplier * elapsedHours,
    cleanliness: stats.cleanliness - 2 * multiplier * elapsedHours,
    happiness: stats.happiness - 1.5 * multiplier * elapsedHours
  });
}

function applyStatChanges(stats: PetStats, changes: PetStatDelta): PetStats {
  return normalizeStats({
    satiety: stats.satiety + (changes.satiety ?? 0),
    cleanliness: stats.cleanliness + (changes.cleanliness ?? 0),
    happiness: stats.happiness + (changes.happiness ?? 0)
  }, stats);
}

function petStatus(stats: PetStats, nowMs: number, endsAtMs: number): PetStatus {
  if (nowMs < endsAtMs) {
    return 'pet';
  }

  return careScore(stats) >= 50 ? 'grown' : 'left';
}

function createCareActionEntry(
  pet: OwnedPet,
  actionId: PetCareActionId,
  now: Date,
  statsBefore: PetStats,
  statsAfter: PetStats
): PetCareActionEntry {
  return {
    id: `${actionId}-${now.getTime()}-${pet.careHistory.length + 1}`,
    actionId,
    appliedAt: now.toISOString(),
    statsBefore,
    statsAfter,
    careScoreBefore: careScore(statsBefore),
    careScoreAfter: careScore(statsAfter),
    moodBefore: petMood(statsBefore),
    moodAfter: petMood(statsAfter)
  };
}

function createFarewellResult(status: Exclude<PetStatus, 'pet'>, stats: PetStats, farewellAt: Date): PetFarewellResult {
  const finalCareScore = careScore(stats);
  const reason: PetFarewellReason = status === 'grown' ? 'grown-up' : 'lack-of-care';

  return {
    reason,
    farewellAt: farewellAt.toISOString(),
    phraseId: farewellPhraseId(reason, finalCareScore),
    finalCareScore,
    finalStats: { ...stats }
  };
}

function farewellPhraseId(reason: PetFarewellReason, finalCareScore: number): PetFarewellPhraseId {
  if (reason === 'lack-of-care') {
    return 'needed-more-care';
  }

  if (finalCareScore >= 80) {
    return 'bright-future';
  }

  return 'ready-for-adventure';
}

function careActionNextAvailableAt(pet: OwnedPet, actionId: PetCareActionId): Date | null {
  const lastActionAt = pet.lastActionAt[actionId];

  if (!lastActionAt) {
    return null;
  }

  const lastActionMs = Date.parse(lastActionAt);

  if (Number.isNaN(lastActionMs)) {
    return null;
  }

  return new Date(lastActionMs + PET_CARE_ACTIONS[actionId].cooldownMinutes * MINUTE_MS);
}

function modeDecayMultiplier(mode: PetMode): number {
  if (mode === 'medium') {
    return 1.2;
  }

  if (mode === 'insane') {
    return 1.6;
  }

  return 1;
}

function normalizeStat(value: number | undefined, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return roundStat(fallback);
  }

  return roundStat(value);
}

function roundStat(value: number): number {
  return Math.round(Math.max(0, Math.min(100, value)) * 10) / 10;
}

function safeTime(value: string, fallback: number): number {
  const time = Date.parse(value);
  return Number.isNaN(time) ? fallback : time;
}
