import { PetMode } from '../pocket-pet/pocket-pet.model';
import {
  OwnedPet,
  PetActivityType,
  PetCareActionEntry,
  PetCareActionFailureReason,
  PetCareActionId,
  PetCareActionResult,
  PetFarewellPhraseId,
  PetFarewellReason,
  PetFarewellResult,
  PetLastActionAt,
  PetMood,
  PetPeriodOfLife,
  PetPerceptionTagId,
  PetStats,
  PetStatus
} from './owned-pet.model';
import { PetSpeciesTraits, petSpeciesTraits } from './pet-species-traits';

const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

type PetStatDelta = Partial<Record<keyof PetStats, number>>;

export interface PetCareActionConfig {
  id: PetCareActionId;
  activityType: PetActivityType;
  playerEnergyCost: number;
  perceptionTags: readonly PetPerceptionTagId[];
  cooldownMinutes: number;
  statChanges: PetStatDelta;
  awayMinutes?: number;
  allowWhenAway?: boolean;
  allowWhenSleeping?: boolean;
  toggleLight?: boolean;
}

export const PET_CARE_ACTION_IDS: readonly PetCareActionId[] = [
  'feed',
  'junkFood',
  'clean',
  'play',
  'walk',
  'toggleLight'
] as const;

export const DEFAULT_PET_STATS: PetStats = {
  satiety: 80,
  cleanliness: 80,
  happiness: 80,
  health: 85,
  energy: 75
};

export const PET_CARE_ACTIONS: Record<PetCareActionId, PetCareActionConfig> = {
  feed: {
    id: 'feed',
    activityType: 'feeding',
    playerEnergyCost: 0,
    perceptionTags: ['basic-care'],
    cooldownMinutes: 10,
    statChanges: {
      satiety: 30,
      cleanliness: -4,
      happiness: 4,
      health: 2
    }
  },
  junkFood: {
    id: 'junkFood',
    activityType: 'treat',
    playerEnergyCost: 0,
    perceptionTags: ['indulgent'],
    cooldownMinutes: 20,
    statChanges: {
      satiety: 45,
      cleanliness: -8,
      happiness: 12,
      health: -18,
      energy: -4
    }
  },
  clean: {
    id: 'clean',
    activityType: 'cleaning',
    playerEnergyCost: 5,
    perceptionTags: ['basic-care'],
    cooldownMinutes: 10,
    statChanges: {
      cleanliness: 40,
      happiness: -3
    }
  },
  play: {
    id: 'play',
    activityType: 'play',
    playerEnergyCost: 15,
    perceptionTags: ['engaged-care'],
    cooldownMinutes: 15,
    statChanges: {
      happiness: 30,
      satiety: -12,
      cleanliness: -8,
      energy: -10
    }
  },
  walk: {
    id: 'walk',
    activityType: 'walk',
    playerEnergyCost: 20,
    perceptionTags: ['engaged-care'],
    cooldownMinutes: 60,
    awayMinutes: 30,
    statChanges: {
      happiness: 24,
      health: 12,
      energy: -18,
      satiety: -14,
      cleanliness: -10
    }
  },
  toggleLight: {
    id: 'toggleLight',
    activityType: 'rest',
    playerEnergyCost: 0,
    perceptionTags: ['rest-routine'],
    cooldownMinutes: 0,
    statChanges: {},
    allowWhenAway: true,
    allowWhenSleeping: true,
    toggleLight: true
  }
};

export function createEmptyLastActionAt(): PetLastActionAt {
  return {
    feed: null,
    junkFood: null,
    clean: null,
    play: null,
    walk: null,
    toggleLight: null
  };
}

export function createInitialPetCareState(
  now: Date = new Date()
): Pick<OwnedPet, 'stats' | 'lastResolvedAt' | 'lastActionAt' | 'isLightOn' | 'awayUntil' | 'careHistory' | 'farewell'> {
  return {
    stats: { ...DEFAULT_PET_STATS },
    lastResolvedAt: now.toISOString(),
    lastActionAt: createEmptyLastActionAt(),
    isLightOn: true,
    awayUntil: null,
    careHistory: [],
    farewell: null
  };
}

export function resolvePetState(pet: OwnedPet, now: Date = new Date()): OwnedPet {
  const nowMs = now.getTime();
  const createdAtMs = safeTime(pet.createdAt, nowMs);
  const endsAtMs = Math.max(createdAtMs, safeTime(pet.endsAt, nowMs));
  const periodOfLife = petPeriodOfLife(createdAtMs, endsAtMs, Math.min(nowMs, endsAtMs));
  const awayUntil = normalizeAwayUntil(pet.awayUntil, now);

  if (pet.status !== 'pet') {
    const stats = normalizeStats(pet.stats);
    return {
      ...pet,
      mood: petMood(stats),
      periodOfLife,
      stats,
      awayUntil,
      farewell: pet.farewell ?? createFarewellResult(pet.status, stats, new Date(endsAtMs))
    };
  }

  const lastResolvedMs = safeTime(pet.lastResolvedAt, createdAtMs);
  const resolveUntilMs = Math.min(nowMs, endsAtMs);
  const elapsedHours = Math.max(0, resolveUntilMs - Math.min(lastResolvedMs, resolveUntilMs)) / HOUR_MS;
  const stats = elapsedHours > 0
    ? decayStats(pet.stats, elapsedHours, pet.mode, pet.isLightOn, petSpeciesTraits(pet.petId))
    : normalizeStats(pet.stats);
  const status = petStatus(stats, nowMs, endsAtMs);
  const farewell = status === 'pet' ? null : createFarewellResult(status, stats, new Date(endsAtMs));

  return {
    ...pet,
    status,
    mood: petMood(stats),
    periodOfLife,
    stats,
    awayUntil,
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
  const blockedReason = careActionFailureReason(resolvedPet, actionId, now);
  const nextAvailableAt = careActionNextAvailableAt(resolvedPet, actionId);

  if (blockedReason) {
    return {
      pet: resolvedPet,
      actionId,
      applied: false,
      reason: blockedReason,
      nextAvailableAt: blockedReason === 'away'
        ? resolvedPet.awayUntil
        : nextAvailableAt?.toISOString() ?? null
    };
  }

  const action = PET_CARE_ACTIONS[actionId];
  const speciesTraits = petSpeciesTraits(resolvedPet.petId);
  const statsBefore = normalizeStats(resolvedPet.stats);
  const isLightOnBefore = resolvedPet.isLightOn;
  const awayUntilBefore = resolvedPet.awayUntil;
  const isLightOnAfter = action.toggleLight ? !resolvedPet.isLightOn : resolvedPet.isLightOn;
  const awayUntilAfter = action.awayMinutes
    ? new Date(now.getTime() + action.awayMinutes * MINUTE_MS).toISOString()
    : resolvedPet.awayUntil;
  const statsAfter = applyStatChanges(statsBefore, action.statChanges, actionId, speciesTraits);
  const changedPet: OwnedPet = {
    ...resolvedPet,
    stats: statsAfter,
    isLightOn: isLightOnAfter,
    awayUntil: awayUntilAfter,
    lastResolvedAt: now.toISOString(),
    lastActionAt: {
      ...resolvedPet.lastActionAt,
      [actionId]: now.toISOString()
    },
    careHistory: [
      ...resolvedPet.careHistory,
      createCareActionEntry(
        resolvedPet,
        actionId,
        now,
        statsBefore,
        statsAfter,
        isLightOnBefore,
        isLightOnAfter,
        awayUntilBefore,
        awayUntilAfter
      )
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

export function careActionFailureReason(
  pet: OwnedPet,
  actionId: PetCareActionId,
  now: Date = new Date()
): PetCareActionFailureReason | null {
  const action = PET_CARE_ACTIONS[actionId];

  if (pet.status !== 'pet') {
    return 'inactive';
  }

  if (!action.allowWhenAway && petAwayRemainingMs(pet, now) > 0) {
    return 'away';
  }

  if (!action.allowWhenSleeping && !pet.isLightOn) {
    return 'sleeping';
  }

  if (careActionCooldownRemainingMs(pet, actionId, now) > 0) {
    return 'cooldown';
  }

  return null;
}

export function petAwayRemainingMs(pet: OwnedPet, now: Date = new Date()): number {
  if (!pet.awayUntil) {
    return 0;
  }

  const awayUntilMs = Date.parse(pet.awayUntil);

  if (Number.isNaN(awayUntilMs)) {
    return 0;
  }

  return Math.max(0, awayUntilMs - now.getTime());
}

export function careActionCooldownRemainingMs(pet: OwnedPet, actionId: PetCareActionId, now: Date = new Date()): number {
  const nextAvailableAt = careActionNextAvailableAt(pet, actionId);

  if (!nextAvailableAt) {
    return 0;
  }

  return Math.max(0, nextAvailableAt.getTime() - now.getTime());
}

export function careScore(stats: PetStats): number {
  const normalizedStats = normalizeStats(stats);
  return roundStat(
    (
      normalizedStats.satiety +
      normalizedStats.cleanliness +
      normalizedStats.happiness +
      normalizedStats.health +
      normalizedStats.energy
    ) / 5
  );
}

export function petMood(stats: PetStats): PetMood {
  const normalizedStats = normalizeStats(stats);
  const minimum = Math.min(
    normalizedStats.satiety,
    normalizedStats.cleanliness,
    normalizedStats.happiness,
    normalizedStats.health,
    normalizedStats.energy
  );

  if (
    normalizedStats.satiety >= 75 &&
    normalizedStats.cleanliness >= 75 &&
    normalizedStats.happiness >= 75 &&
    normalizedStats.health >= 75 &&
    normalizedStats.energy >= 75
  ) {
    return 'joyful';
  }

  if (normalizedStats.satiety < 25) {
    return 'angry';
  }

  if (normalizedStats.cleanliness < 25) {
    return 'irritated';
  }

  if (normalizedStats.happiness < 25 || normalizedStats.health < 25) {
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
    happiness: normalizeStat(stats?.happiness, fallback.happiness),
    health: normalizeStat(stats?.health, fallback.health),
    energy: normalizeStat(stats?.energy, fallback.energy)
  };
}

function decayStats(
  stats: PetStats,
  elapsedHours: number,
  mode: PetMode,
  isLightOn: boolean,
  speciesTraits: PetSpeciesTraits
): PetStats {
  const multiplier = modeDecayMultiplier(mode);
  const normalizedStats = normalizeStats(stats);
  const happinessDecay = (isLightOn ? 1.5 : 0.6) * speciesTraits.decayMultipliers.happiness;
  const energyDelta = isLightOn
    ? -1.25 * multiplier * elapsedHours * speciesTraits.decayMultipliers.energy
    : 6 * elapsedHours * speciesTraits.restRecoveryMultiplier;

  return normalizeStats({
    satiety: normalizedStats.satiety - 3 * multiplier * elapsedHours * speciesTraits.decayMultipliers.satiety,
    cleanliness: normalizedStats.cleanliness - 2 * multiplier * elapsedHours * speciesTraits.decayMultipliers.cleanliness,
    happiness: normalizedStats.happiness - happinessDecay * multiplier * elapsedHours,
    health: normalizedStats.health - healthDecay(
      normalizedStats,
      elapsedHours,
      multiplier,
      speciesTraits.decayMultipliers.health
    ),
    energy: normalizedStats.energy + energyDelta
  });
}

function healthDecay(stats: PetStats, elapsedHours: number, multiplier: number, speciesMultiplier: number): number {
  const minimum = Math.min(stats.satiety, stats.cleanliness, stats.happiness, stats.energy);
  const stress = minimum < 25 ? 2 : minimum < 45 ? 1 : 0;

  return (0.4 + stress) * multiplier * elapsedHours * speciesMultiplier;
}

function applyStatChanges(
  stats: PetStats,
  changes: PetStatDelta,
  actionId: PetCareActionId,
  speciesTraits: PetSpeciesTraits
): PetStats {
  return normalizeStats({
    satiety: stats.satiety + statChangeDelta(changes.satiety, 'satiety', actionId, speciesTraits),
    cleanliness: stats.cleanliness + statChangeDelta(changes.cleanliness, 'cleanliness', actionId, speciesTraits),
    happiness: stats.happiness + statChangeDelta(changes.happiness, 'happiness', actionId, speciesTraits),
    health: stats.health + statChangeDelta(changes.health, 'health', actionId, speciesTraits),
    energy: stats.energy + statChangeDelta(changes.energy, 'energy', actionId, speciesTraits)
  }, stats);
}

function statChangeDelta(
  value: number | undefined,
  statId: keyof PetStats,
  actionId: PetCareActionId,
  speciesTraits: PetSpeciesTraits
): number {
  if (!value) {
    return 0;
  }

  const statMultiplier = value > 0
    ? speciesTraits.statGainMultipliers[statId]
    : speciesTraits.statLossMultipliers[statId];

  return value * statMultiplier * speciesTraits.careActionEffectMultipliers[actionId];
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
  statsAfter: PetStats,
  isLightOnBefore: boolean,
  isLightOnAfter: boolean,
  awayUntilBefore: string | null,
  awayUntilAfter: string | null
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
    moodAfter: petMood(statsAfter),
    isLightOnBefore,
    isLightOnAfter,
    awayUntilBefore,
    awayUntilAfter
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

function normalizeAwayUntil(awayUntil: string | null, now: Date): string | null {
  if (!awayUntil) {
    return null;
  }

  const awayUntilMs = Date.parse(awayUntil);

  if (Number.isNaN(awayUntilMs) || awayUntilMs <= now.getTime()) {
    return null;
  }

  return awayUntil;
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
