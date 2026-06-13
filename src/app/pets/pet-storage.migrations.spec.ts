import { describe, expect, it } from 'vitest';

import { deserializePets, PET_STORAGE_VERSION, serializePets } from './pet-storage.migrations';

describe('pet storage migrations', () => {
  it('migrates 0.1.1 pets without applying offline decay', () => {
    const rawPets = JSON.stringify({
      version: '0.1.1',
      pets: [
        {
          id: 'cat-old',
          name: 'Mila',
          petId: 'cat',
          mode: 'easy',
          status: 'pet',
          mood: 'joyful',
          periodOfLife: 'child',
          sessionLengthId: 'standard',
          createdAt: '2026-06-13T10:00:00.000Z',
          endsAt: '2026-06-16T10:00:00.000Z'
        }
      ]
    });

    const pets = deserializePets(rawPets, new Date('2026-06-13T12:00:00.000Z'));

    expect(pets).toHaveLength(1);
    expect(pets[0].stats).toEqual({
      satiety: 80,
      cleanliness: 80,
      happiness: 80,
      health: 85,
      energy: 75
    });
    expect(pets[0].lastResolvedAt).toBe('2026-06-13T12:00:00.000Z');
    expect(pets[0].status).toBe('pet');
    expect(pets[0].isLightOn).toBe(true);
    expect(pets[0].awayUntil).toBeNull();
    expect(pets[0].careHistory).toEqual([]);
    expect(pets[0].farewell).toBeNull();
  });

  it('migrates 0.2.0 pets with elapsed time applied', () => {
    const rawPets = JSON.stringify({
      version: '0.2.0',
      pets: [
        {
          id: 'cat-new',
          name: 'Mila',
          petId: 'cat',
          mode: 'easy',
          status: 'pet',
          mood: 'joyful',
          periodOfLife: 'child',
          stats: {
            satiety: 80,
            cleanliness: 80,
            happiness: 80
          },
          sessionLengthId: 'standard',
          createdAt: '2026-06-13T10:00:00.000Z',
          endsAt: '2026-06-16T10:00:00.000Z',
          lastResolvedAt: '2026-06-13T10:00:00.000Z',
          lastActionAt: {
            feed: null,
            clean: null,
            play: null
          }
        }
      ]
    });

    const pets = deserializePets(rawPets, new Date('2026-06-13T11:00:00.000Z'));

    expect(pets[0].stats).toEqual({
      satiety: 77,
      cleanliness: 78,
      happiness: 78.5,
      health: 84.6,
      energy: 73.8
    });
    expect(pets[0].lastActionAt).toEqual({
      feed: null,
      junkFood: null,
      clean: null,
      play: null,
      walk: null,
      toggleLight: null
    });
    expect(pets[0].isLightOn).toBe(true);
    expect(pets[0].awayUntil).toBeNull();
    expect(pets[0].careHistory).toEqual([]);
    expect(pets[0].farewell).toBeNull();
  });

  it('preserves 0.4.0 care history, light state, away state, and farewell results', () => {
    const rawPets = JSON.stringify({
      version: PET_STORAGE_VERSION,
      pets: [
        {
          id: 'cat-new',
          name: 'Mila',
          petId: 'cat',
          mode: 'easy',
          status: 'grown',
          mood: 'joyful',
          periodOfLife: 'adult',
          stats: {
            satiety: 90,
            cleanliness: 85,
            happiness: 95,
            health: 88,
            energy: 92
          },
          sessionLengthId: 'standard',
          createdAt: '2026-06-13T10:00:00.000Z',
          endsAt: '2026-06-16T10:00:00.000Z',
          lastResolvedAt: '2026-06-16T10:00:00.000Z',
          lastActionAt: {
            feed: '2026-06-13T10:00:00.000Z',
            junkFood: null,
            clean: null,
            play: null,
            walk: '2026-06-13T11:00:00.000Z',
            toggleLight: '2026-06-13T12:00:00.000Z'
          },
          isLightOn: false,
          awayUntil: '2026-06-13T11:30:00.000Z',
          careHistory: [
            {
              id: 'feed-1',
              actionId: 'feed',
              appliedAt: '2026-06-13T10:00:00.000Z',
              statsBefore: {
                satiety: 50,
                cleanliness: 50,
                happiness: 50,
                health: 50,
                energy: 50
              },
              statsAfter: {
                satiety: 80,
                cleanliness: 46,
                happiness: 54,
                health: 52,
                energy: 50
              },
              careScoreBefore: 50,
              careScoreAfter: 56.4,
              moodBefore: 'thoughtful',
              moodAfter: 'neutral',
              isLightOnBefore: true,
              isLightOnAfter: true,
              awayUntilBefore: null,
              awayUntilAfter: null
            }
          ],
          farewell: {
            reason: 'grown-up',
            farewellAt: '2026-06-16T10:00:00.000Z',
            phraseId: 'bright-future',
            finalCareScore: 90,
            finalStats: {
              satiety: 90,
              cleanliness: 85,
              happiness: 95,
              health: 88,
              energy: 92
            }
          }
        }
      ]
    });

    const pets = deserializePets(rawPets, new Date('2026-06-17T10:00:00.000Z'));

    expect(pets[0].isLightOn).toBe(false);
    expect(pets[0].awayUntil).toBeNull();
    expect(pets[0].careHistory).toHaveLength(1);
    expect(pets[0].careHistory[0]).toMatchObject({
      actionId: 'feed',
      isLightOnBefore: true,
      isLightOnAfter: true,
      awayUntilBefore: null,
      awayUntilAfter: null
    });
    expect(pets[0].farewell).toEqual({
      reason: 'grown-up',
      farewellAt: '2026-06-16T10:00:00.000Z',
      phraseId: 'bright-future',
      finalCareScore: 90,
      finalStats: {
        satiety: 90,
        cleanliness: 85,
        happiness: 95,
        health: 88,
        energy: 92
      }
    });
  });

  it('serializes pets with the current storage version', () => {
    const pets = deserializePets(JSON.stringify({
      version: '0.1.1',
      pets: [
        {
          id: 'cat-old',
          name: 'Mila',
          petId: 'cat',
          mode: 'easy',
          status: 'pet',
          mood: 'joyful',
          periodOfLife: 'child',
          sessionLengthId: 'standard',
          createdAt: '2026-06-13T10:00:00.000Z',
          endsAt: '2026-06-16T10:00:00.000Z'
        }
      ]
    }), new Date('2026-06-13T12:00:00.000Z'));
    const serialized = JSON.parse(serializePets(pets)) as { version: string };

    expect(serialized.version).toBe(PET_STORAGE_VERSION);
  });
});
