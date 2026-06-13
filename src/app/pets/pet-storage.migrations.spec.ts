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
  });

  it('deserializes 0.2.0 pets with elapsed time applied', () => {
    const rawPets = JSON.stringify({
      version: PET_STORAGE_VERSION,
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
