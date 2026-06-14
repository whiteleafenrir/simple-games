import { describe, expect, it } from 'vitest';

import { OwnedPet, PetLastActionAt, PetStats } from './owned-pet.model';
import {
  applyPetCareAction,
  careActionCooldownRemainingMs,
  careActionFailureReason,
  careScore,
  createEmptyLastActionAt,
  createInitialPlayerEnergy,
  DEFAULT_PET_STATS,
  petMood,
  petAwayRemainingMs,
  resolvePetState
} from './pet-engine';

const createdAt = '2026-06-13T10:00:00.000Z';
const endsAt = '2026-06-16T10:00:00.000Z';

function pet(overrides: Partial<OwnedPet> = {}): OwnedPet {
  return {
    id: 'cat-1',
    name: 'Rex',
    petId: 'cat',
    mode: 'easy',
    status: 'pet',
    mood: 'joyful',
    periodOfLife: 'child',
    stats: { ...DEFAULT_PET_STATS },
    sessionLengthId: 'standard',
    createdAt,
    endsAt,
    lastResolvedAt: createdAt,
    playerEnergy: createInitialPlayerEnergy(new Date(createdAt)),
    lastActionAt: createEmptyLastActionAt(),
    isLightOn: true,
    awayUntil: null,
    careHistory: [],
    farewell: null,
    ...overrides
  };
}

describe('pet engine', () => {
  it('decays stats over offline time', () => {
    const resolved = resolvePetState(pet(), new Date('2026-06-13T11:00:00.000Z'));

    expect(resolved.stats).toEqual({
      satiety: 77,
      cleanliness: 78,
      happiness: 78.5,
      health: 84.6,
      energy: 73.8
    });
    expect(resolved.status).toBe('pet');
    expect(resolved.lastResolvedAt).toBe('2026-06-13T11:00:00.000Z');
  });

  it('recovers energy faster while the light is off', () => {
    const resolved = resolvePetState(pet({ isLightOn: false }), new Date('2026-06-13T11:00:00.000Z'));

    expect(resolved.stats).toEqual({
      satiety: 77,
      cleanliness: 78,
      happiness: 79.4,
      health: 84.6,
      energy: 81
    });
  });

  it('clamps care action effects to the 0..100 range', () => {
    const result = applyPetCareAction(pet({
      stats: {
        satiety: 90,
        cleanliness: 10,
        happiness: 98,
        health: 99,
        energy: 99
      }
    }), 'feed', new Date(createdAt));

    expect(result.applied).toBe(true);
    expect(result.pet.stats).toEqual({
      satiety: 100,
      cleanliness: 6,
      happiness: 100,
      health: 100,
      energy: 99
    });
  });

  it('blocks a care action during cooldown', () => {
    const lastActionAt: PetLastActionAt = {
      ...createEmptyLastActionAt(),
      feed: createdAt
    };
    const result = applyPetCareAction(pet({ lastActionAt }), 'feed', new Date('2026-06-13T10:05:00.000Z'));

    expect(result.applied).toBe(false);
    expect(result.reason).toBe('cooldown');
    expect(result.nextAvailableAt).toBe('2026-06-13T10:10:00.000Z');
    expect(careActionCooldownRemainingMs(result.pet, 'feed', new Date('2026-06-13T10:05:00.000Z'))).toBe(5 * 60 * 1000);
  });

  it('recovers player energy over time', () => {
    const resolved = resolvePetState(pet({
      playerEnergy: {
        current: 40,
        max: 100,
        lastRecoveredAt: createdAt
      }
    }), new Date('2026-06-13T11:30:00.000Z'));

    expect(resolved.playerEnergy).toEqual({
      current: 58,
      max: 100,
      lastRecoveredAt: '2026-06-13T11:30:00.000Z'
    });
  });

  it('spends player energy and blocks actions when the budget is too low', () => {
    const start = pet({
      playerEnergy: {
        current: 10,
        max: 100,
        lastRecoveredAt: createdAt
      }
    });
    const cleaned = applyPetCareAction(start, 'clean', new Date(createdAt));
    const blocked = applyPetCareAction(start, 'play', new Date(createdAt));

    expect(cleaned.applied).toBe(true);
    expect(cleaned.pet.playerEnergy.current).toBe(5);
    expect(blocked.applied).toBe(false);
    expect(blocked.reason).toBe('player-energy');
    expect(blocked.nextAvailableAt).toBe('2026-06-13T10:25:00.000Z');
  });

  it('applies feed, junk food, clean, play, and walk effects', () => {
    const start = pet({ stats: stats(50, 50, 50, 50, 50) });
    const fed = applyPetCareAction(start, 'feed', new Date(createdAt)).pet;
    const junkFed = applyPetCareAction(start, 'junkFood', new Date(createdAt)).pet;
    const cleaned = applyPetCareAction(start, 'clean', new Date(createdAt)).pet;
    const played = applyPetCareAction(start, 'play', new Date(createdAt)).pet;
    const walked = applyPetCareAction(start, 'walk', new Date(createdAt)).pet;

    expect(fed.stats).toEqual(stats(80, 46, 54, 52, 50));
    expect(junkFed.stats).toEqual(stats(95, 42, 62, 32, 46));
    expect(cleaned.stats).toEqual(stats(50, 90, 47, 50, 50));
    expect(played.stats).toEqual(stats(38, 42, 80, 50, 40));
    expect(walked.stats).toEqual(stats(36, 40, 74, 62, 32));
    expect(walked.awayUntil).toBe('2026-06-13T10:30:00.000Z');
  });

  it('records applied care actions in history', () => {
    const start = pet({ stats: stats(50, 50, 50, 50, 50) });
    const result = applyPetCareAction(start, 'play', new Date(createdAt));

    expect(result.pet.careHistory).toHaveLength(1);
    expect(result.pet.careHistory[0]).toMatchObject({
      actionId: 'play',
      appliedAt: createdAt,
      statsBefore: stats(50, 50, 50, 50, 50),
      statsAfter: stats(38, 42, 80, 50, 40),
      careScoreBefore: 50,
      careScoreAfter: 50,
      moodBefore: 'thoughtful',
      moodAfter: 'thoughtful',
      isLightOnBefore: true,
      isLightOnAfter: true,
      awayUntilBefore: null,
      awayUntilAfter: null
    });
  });

  it('blocks care while the pet is away from a walk', () => {
    const walked = applyPetCareAction(pet(), 'walk', new Date(createdAt)).pet;
    const result = applyPetCareAction(walked, 'feed', new Date('2026-06-13T10:05:00.000Z'));

    expect(result.applied).toBe(false);
    expect(result.reason).toBe('away');
    expect(result.nextAvailableAt).toBe('2026-06-13T10:30:00.000Z');
    expect(petAwayRemainingMs(result.pet, new Date('2026-06-13T10:05:00.000Z'))).toBe(25 * 60 * 1000);
  });

  it('blocks ordinary care while sleeping but allows light toggling', () => {
    const sleeping = applyPetCareAction(pet(), 'toggleLight', new Date(createdAt)).pet;
    const blocked = applyPetCareAction(sleeping, 'feed', new Date('2026-06-13T10:01:00.000Z'));
    const awakened = applyPetCareAction(sleeping, 'toggleLight', new Date('2026-06-13T10:01:00.000Z'));

    expect(sleeping.isLightOn).toBe(false);
    expect(careActionFailureReason(sleeping, 'feed', new Date('2026-06-13T10:01:00.000Z'))).toBe('sleeping');
    expect(blocked.applied).toBe(false);
    expect(blocked.reason).toBe('sleeping');
    expect(awakened.applied).toBe(true);
    expect(awakened.pet.isLightOn).toBe(true);
  });

  it('derives mood from stat thresholds', () => {
    expect(petMood(stats(80, 80, 80, 80, 80))).toBe('joyful');
    expect(petMood(stats(60, 65, 70, 70, 70))).toBe('neutral');
    expect(petMood(stats(44, 70, 70, 70, 70))).toBe('thoughtful');
    expect(petMood(stats(24, 80, 80, 80, 80))).toBe('angry');
    expect(petMood(stats(80, 24, 80, 80, 80))).toBe('irritated');
    expect(petMood(stats(80, 80, 24, 80, 80))).toBe('upset');
    expect(petMood(stats(80, 80, 80, 24, 80))).toBe('upset');
  });

  it('ends a session softly as grown or left based on care score', () => {
    const grown = resolvePetState(pet({
      stats: stats(90, 90, 90, 90, 90),
      lastResolvedAt: '2026-06-16T09:30:00.000Z'
    }), new Date('2026-06-16T10:30:00.000Z'));
    const left = resolvePetState(pet({
      stats: stats(10, 10, 10, 10, 10),
      lastResolvedAt: '2026-06-16T09:30:00.000Z'
    }), new Date('2026-06-16T10:30:00.000Z'));

    expect(grown.status).toBe('grown');
    expect(grown.periodOfLife).toBe('adult');
    expect(grown.farewell).toEqual({
      reason: 'grown-up',
      farewellAt: endsAt,
      phraseId: 'bright-future',
      finalCareScore: 89.2,
      finalStats: {
        satiety: 88.5,
        cleanliness: 89,
        happiness: 89.3,
        health: 89.8,
        energy: 89.4
      }
    });
    expect(left.status).toBe('left');
    expect(left.farewell).toEqual({
      reason: 'lack-of-care',
      farewellAt: endsAt,
      phraseId: 'needed-more-care',
      finalCareScore: 9,
      finalStats: {
        satiety: 8.5,
        cleanliness: 9,
        happiness: 9.3,
        health: 8.8,
        energy: 9.4
      }
    });
  });

  it('calculates an average care score', () => {
    expect(careScore(stats(75, 50, 25, 50, 50))).toBe(50);
  });
});

function stats(satiety: number, cleanliness: number, happiness: number, health: number, energy: number): PetStats {
  return {
    satiety,
    cleanliness,
    happiness,
    health,
    energy
  };
}
