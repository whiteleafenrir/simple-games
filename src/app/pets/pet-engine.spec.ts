import { describe, expect, it } from 'vitest';

import { OwnedPet, PetLastActionAt, PetStats } from './owned-pet.model';
import {
  applyPetCareAction,
  careActionCooldownRemainingMs,
  careScore,
  createEmptyLastActionAt,
  DEFAULT_PET_STATS,
  petMood,
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
    lastActionAt: createEmptyLastActionAt(),
    ...overrides
  };
}

describe('pet engine', () => {
  it('decays stats over offline time', () => {
    const resolved = resolvePetState(pet(), new Date('2026-06-13T11:00:00.000Z'));

    expect(resolved.stats).toEqual({
      satiety: 77,
      cleanliness: 78,
      happiness: 78.5
    });
    expect(resolved.status).toBe('pet');
    expect(resolved.lastResolvedAt).toBe('2026-06-13T11:00:00.000Z');
  });

  it('clamps care action effects to the 0..100 range', () => {
    const result = applyPetCareAction(pet({
      stats: {
        satiety: 90,
        cleanliness: 10,
        happiness: 98
      }
    }), 'feed', new Date(createdAt));

    expect(result.applied).toBe(true);
    expect(result.pet.stats).toEqual({
      satiety: 100,
      cleanliness: 5,
      happiness: 100
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

  it('applies feed, clean, and play effects', () => {
    const start = pet({ stats: { satiety: 50, cleanliness: 50, happiness: 50 } });
    const fed = applyPetCareAction(start, 'feed', new Date(createdAt)).pet;
    const cleaned = applyPetCareAction(start, 'clean', new Date(createdAt)).pet;
    const played = applyPetCareAction(start, 'play', new Date(createdAt)).pet;

    expect(fed.stats).toEqual({ satiety: 85, cleanliness: 45, happiness: 55 });
    expect(cleaned.stats).toEqual({ satiety: 50, cleanliness: 90, happiness: 47 });
    expect(played.stats).toEqual({ satiety: 38, cleanliness: 42, happiness: 80 });
  });

  it('derives mood from stat thresholds', () => {
    expect(petMood(stats(80, 80, 80))).toBe('joyful');
    expect(petMood(stats(60, 65, 70))).toBe('neutral');
    expect(petMood(stats(44, 70, 70))).toBe('thoughtful');
    expect(petMood(stats(24, 80, 80))).toBe('angry');
    expect(petMood(stats(80, 24, 80))).toBe('irritated');
    expect(petMood(stats(80, 80, 24))).toBe('upset');
  });

  it('ends a session softly as grown or left based on care score', () => {
    const grown = resolvePetState(pet({
      stats: stats(90, 90, 90),
      lastResolvedAt: '2026-06-16T09:30:00.000Z'
    }), new Date('2026-06-16T10:30:00.000Z'));
    const left = resolvePetState(pet({
      stats: stats(10, 10, 10),
      lastResolvedAt: '2026-06-16T09:30:00.000Z'
    }), new Date('2026-06-16T10:30:00.000Z'));

    expect(grown.status).toBe('grown');
    expect(grown.periodOfLife).toBe('adult');
    expect(left.status).toBe('left');
  });

  it('calculates an average care score', () => {
    expect(careScore(stats(75, 50, 25))).toBe(50);
  });
});

function stats(satiety: number, cleanliness: number, happiness: number): PetStats {
  return {
    satiety,
    cleanliness,
    happiness
  };
}
