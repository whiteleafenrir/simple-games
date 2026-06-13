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
      happiness: 80
    });
    expect(pets[0].lastResolvedAt).toBe('2026-06-13T12:00:00.000Z');
    expect(pets[0].status).toBe('pet');
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
      happiness: 78.5
    });
    expect(pets[0].careHistory).toEqual([]);
    expect(pets[0].farewell).toBeNull();
  });

  it('preserves 0.3.0 care history and farewell results', () => {
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
            happiness: 95
          },
          sessionLengthId: 'standard',
          createdAt: '2026-06-13T10:00:00.000Z',
          endsAt: '2026-06-16T10:00:00.000Z',
          lastResolvedAt: '2026-06-16T10:00:00.000Z',
          lastActionAt: {
            feed: '2026-06-13T10:00:00.000Z',
            clean: null,
            play: null
          },
          careHistory: [
            {
              id: 'feed-1',
              actionId: 'feed',
              appliedAt: '2026-06-13T10:00:00.000Z',
              statsBefore: {
                satiety: 50,
                cleanliness: 50,
                happiness: 50
              },
              statsAfter: {
                satiety: 85,
                cleanliness: 45,
                happiness: 55
              },
              careScoreBefore: 50,
              careScoreAfter: 61.7,
              moodBefore: 'thoughtful',
              moodAfter: 'neutral'
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
              happiness: 95
            }
          }
        }
      ]
    });

    const pets = deserializePets(rawPets, new Date('2026-06-17T10:00:00.000Z'));

    expect(pets[0].careHistory).toHaveLength(1);
    expect(pets[0].careHistory[0].actionId).toBe('feed');
    expect(pets[0].farewell).toEqual({
      reason: 'grown-up',
      farewellAt: '2026-06-16T10:00:00.000Z',
      phraseId: 'bright-future',
      finalCareScore: 90,
      finalStats: {
        satiety: 90,
        cleanliness: 85,
        happiness: 95
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
