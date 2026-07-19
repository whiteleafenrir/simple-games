import { describe, expect, it } from 'vitest';

import { OwnedPet, PetLastActionAt, PetStats } from './pet-domain.types';
import {
  applyPetCareAction,
  careActionCooldownRemainingMs,
  createEmptyLastActionAt,
  createInitialPlayerEnergy,
  DEFAULT_PET_STATS,
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

describe('backend pet engine', () => {
  it('keeps frontend parity for offline decay', () => {
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

  it('applies care effects, history, cooldown, player energy and walk away time', () => {
    const result = applyPetCareAction(pet({ stats: stats(50, 50, 50, 50, 50) }), 'walk', new Date(createdAt));

    expect(result.applied).toBe(true);
    expect(result.pet.stats).toEqual(stats(36, 40, 74, 62, 32));
    expect(result.pet.playerEnergy.current).toBe(80);
    expect(result.pet.awayUntil).toBe('2026-06-13T10:30:00.000Z');
    expect(result.pet.careHistory).toHaveLength(1);
    expect(result.nextAvailableAt).toBe('2026-06-13T11:00:00.000Z');
  });

  it('blocks cooldown through the backend engine result shape', () => {
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

  it('finalizes a session with a farewell result on backend time', () => {
    const grown = resolvePetState(pet({
      stats: stats(90, 90, 90, 90, 90),
      lastResolvedAt: '2026-06-16T09:30:00.000Z'
    }), new Date('2026-06-16T10:30:00.000Z'));

    expect(grown.status).toBe('grown');
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
