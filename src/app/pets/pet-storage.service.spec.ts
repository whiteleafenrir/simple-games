import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PET_OPTIONS, SESSION_LENGTHS } from '../pocket-pet/pocket-pet.config';
import { PetOption, SessionLength } from '../pocket-pet/pocket-pet.model';
import { createEmptyLastActionAt, createInitialPlayerEnergy, DEFAULT_PET_STATS } from './pet-engine';
import { OwnedPet, PetCareActionId, PetCareActionResult } from './owned-pet.model';
import { GuestSessionDto, PetApiService } from './pet-api.service';
import { PetStorageService } from './pet-storage.service';

const GUEST_ID_STORAGE_KEY = 'simple-games:pocket-pet:guest-id';
const createdAt = '2026-06-13T10:00:00.000Z';

class MemoryLocalStorage implements Storage {
  private readonly store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.store.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  keys(): string[] {
    return [...this.store.keys()];
  }
}

class FakePetApiService implements Pick<PetApiService, 'createOrGetGuestSession' | 'getPets' | 'createPet' | 'applyCareAction'> {
  readonly sessionRequests: Array<string | null> = [];
  readonly createPetRequests: Array<{ guestId: string; petId: string; sessionLengthId: string; name: string }> = [];
  readonly careActionRequests: Array<{ guestId: string; petId: string; actionId: PetCareActionId }> = [];
  pets: OwnedPet[] = [];

  async createOrGetGuestSession(guestId: string | null): Promise<GuestSessionDto> {
    this.sessionRequests.push(guestId);
    return {
      id: guestId ?? 'guest-created',
      createdAt,
      lastSeenAt: createdAt
    };
  }

  async getPets(_guestId: string): Promise<OwnedPet[]> {
    return this.pets;
  }

  async createPet(guestId: string, pet: PetOption, sessionLength: SessionLength, name: string): Promise<OwnedPet> {
    this.createPetRequests.push({
      guestId,
      petId: pet.id,
      sessionLengthId: sessionLength.id,
      name
    });
    const ownedPet = petFixture({
      id: `${pet.id}-from-api`,
      name,
      petId: pet.id,
      mode: pet.mode,
      sessionLengthId: sessionLength.id
    });
    this.pets = [ownedPet, ...this.pets];
    return ownedPet;
  }

  async applyCareAction(guestId: string, petId: string, actionId: PetCareActionId): Promise<PetCareActionResult> {
    this.careActionRequests.push({
      guestId,
      petId,
      actionId
    });
    const pet = this.pets.find((candidate: OwnedPet): boolean => candidate.id === petId) ?? petFixture({ id: petId });
    const updatedPet = {
      ...pet,
      lastActionAt: {
        ...pet.lastActionAt,
        [actionId]: createdAt
      }
    };
    this.pets = this.pets.map((candidate: OwnedPet): OwnedPet => candidate.id === petId ? updatedPet : candidate);

    return {
      pet: updatedPet,
      actionId,
      applied: true,
      reason: null,
      nextAvailableAt: null
    };
  }
}

let storage: MemoryLocalStorage;
let service: PetStorageService | null;

beforeEach(() => {
  storage = new MemoryLocalStorage();
  service = null;
  Object.defineProperty(globalThis, 'localStorage', {
    value: storage,
    configurable: true
  });
});

afterEach(() => {
  service?.ngOnDestroy();
  vi.restoreAllMocks();
});

describe('PetStorageService backend boundary', () => {
  it('creates a guest session and stores only guest id in localStorage', async () => {
    const api = new FakePetApiService();
    service = new PetStorageService(api as unknown as PetApiService);

    await service.ready();

    expect(api.sessionRequests).toEqual([null]);
    expect(service.guestId()).toBe('guest-created');
    expect(storage.getItem(GUEST_ID_STORAGE_KEY)).toBe('guest-created');
    expect(storage.keys()).toEqual([GUEST_ID_STORAGE_KEY]);
  });

  it('restores an existing guest id and loads pets from the backend API', async () => {
    storage.setItem(GUEST_ID_STORAGE_KEY, 'guest-existing');
    const api = new FakePetApiService();
    api.pets = [petFixture({ id: 'cat-existing' })];
    service = new PetStorageService(api as unknown as PetApiService);

    await service.ready();

    expect(api.sessionRequests).toEqual(['guest-existing']);
    expect(service.pets()).toHaveLength(1);
    expect(service.petById('cat-existing')?.id).toBe('cat-existing');
    expect(storage.keys()).toEqual([GUEST_ID_STORAGE_KEY]);
  });

  it('creates pets and applies care actions through the backend API boundary', async () => {
    const api = new FakePetApiService();
    service = new PetStorageService(api as unknown as PetApiService);
    await service.ready();

    const pet = await service.addPet(PET_OPTIONS[0], SESSION_LENGTHS[1], 'Mila');
    const result = pet ? await service.careForPet(pet.id, 'feed') : null;

    expect(api.createPetRequests).toEqual([{
      guestId: 'guest-created',
      petId: 'cat',
      sessionLengthId: 'standard',
      name: 'Mila'
    }]);
    expect(api.careActionRequests).toEqual([{
      guestId: 'guest-created',
      petId: 'cat-from-api',
      actionId: 'feed'
    }]);
    expect(result?.applied).toBe(true);
    expect(storage.keys()).toEqual([GUEST_ID_STORAGE_KEY]);
  });
});

function petFixture(overrides: Partial<OwnedPet> = {}): OwnedPet {
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
    endsAt: '2026-06-16T10:00:00.000Z',
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
