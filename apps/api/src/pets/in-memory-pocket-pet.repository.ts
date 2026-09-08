import { randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';

import { GuestSession, OwnedPet } from './pet-domain.types';
import { ActivePetConflictError, GuestSessionNotFoundError, PocketPetRepository, PocketPetTransaction } from './pocket-pet.repository';

interface StoredPet {
  guestId: string;
  pet: OwnedPet;
}

export class InMemoryPocketPetRepository implements PocketPetRepository {
  private readonly sessions = new Map<string, GuestSession>();
  private readonly pets = new Map<string, StoredPet>();
  private readonly guestQueues = new Map<string, Promise<void>>();
  private readonly tokens = new Map<string, { guestId: string; expiresAt: number }>();

  async createAuthenticatedGuestSession(tokenHash: string, tokenExpiresAt: Date, now: Date): Promise<GuestSession> {
    const session = await this.getOrCreateGuestSession(null, now);
    this.tokens.set(tokenHash, { guestId: session.id, expiresAt: tokenExpiresAt.getTime() });
    return session;
  }

  async findGuestSessionByTokenHash(tokenHash: string, now: Date): Promise<GuestSession | null> {
    const token = this.tokens.get(tokenHash);
    const session = token && token.expiresAt > now.getTime() ? this.sessions.get(token.guestId) : null;
    return session ? clone(session) : null;
  }

  async renewGuestSessionToken(guestId: string, tokenHash: string, tokenExpiresAt: Date, now: Date): Promise<GuestSession | null> {
    const session = await this.findGuestSessionByTokenHash(tokenHash, now);
    if (!session || session.id !== guestId) {
      return null;
    }
    this.tokens.set(tokenHash, { guestId, expiresAt: tokenExpiresAt.getTime() });
    return this.touchGuestSession(guestId, now);
  }

  async getOrCreateGuestSession(guestId: string | null, now: Date): Promise<GuestSession> {
    if (guestId) {
      const existingSession = this.sessions.get(guestId);

      if (existingSession) {
        const touchedSession = {
          ...existingSession,
          lastSeenAt: now.toISOString()
        };
        this.sessions.set(guestId, touchedSession);
        return clone(touchedSession);
      }
    }

    const id = guestId || randomUUID();
    const session: GuestSession = {
      id,
      createdAt: now.toISOString(),
      lastSeenAt: now.toISOString()
    };
    this.sessions.set(id, session);
    return clone(session);
  }

  async touchGuestSession(guestId: string, now: Date): Promise<GuestSession | null> {
    const session = this.sessions.get(guestId);

    if (!session) {
      return null;
    }

    const touchedSession = {
      ...session,
      lastSeenAt: now.toISOString()
    };
    this.sessions.set(guestId, touchedSession);
    return clone(touchedSession);
  }

  async withGuestTransaction<T>(guestId: string, operation: (transaction: PocketPetTransaction) => Promise<T>): Promise<T> {
    const previous = this.guestQueues.get(guestId) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => { release = resolve; });
    this.guestQueues.set(guestId, current);
    await previous;
    try {
      const session = this.sessions.get(guestId);
      if (!session) {
        throw new GuestSessionNotFoundError();
      }
      const pets = new Map([...this.pets.values()]
        .filter((stored) => stored.guestId === guestId).map((stored) => [stored.pet.id, clone(stored.pet)]));
      const tx = new MemoryPetTransaction(clone(session), pets);
      const result = await operation(tx);
      const events = new Map([...this.pets.values()].flatMap(({ pet }) =>
        pet.careHistory.map((entry) => [entry.id, { petId: pet.id, entry }] as const)));
      for (const pet of pets.values()) {
        for (const entry of pet.careHistory) {
          const existing = events.get(entry.id);
          if (existing && (existing.petId !== pet.id || !isDeepStrictEqual(existing.entry, entry))) {
            throw new Error('Care history event conflicts with its persisted owner or content.');
          }
          events.set(entry.id, { petId: pet.id, entry });
        }
      }
      this.sessions.set(guestId, tx.session);
      for (const pet of pets.values()) {
        this.pets.set(pet.id, { guestId, pet: clone(pet) });
      }
      return result;
    } finally {
      release();
      if (this.guestQueues.get(guestId) === current) this.guestQueues.delete(guestId);
    }
  }
}

class MemoryPetTransaction implements PocketPetTransaction {
  constructor(public session: GuestSession, private readonly pets: Map<string, OwnedPet>) {}

  async touchGuestSession(now: Date): Promise<void> {
    this.session = { ...this.session, lastSeenAt: now.toISOString() };
  }

  async listPets(): Promise<OwnedPet[]> {
    return [...this.pets.values()].map(clone)
      .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
  }

  async getPet(petId: string): Promise<OwnedPet | null> {
    const pet = this.pets.get(petId);
    return pet ? clone(pet) : null;
  }

  async createPet(pet: OwnedPet): Promise<OwnedPet> {
    if (this.pets.has(pet.id)) throw new Error('Pet already exists.');
    return this.store(pet);
  }

  async savePet(pet: OwnedPet): Promise<OwnedPet> {
    if (!this.pets.has(pet.id)) throw new Error('Pet does not belong to the transaction guest.');
    return this.store(pet);
  }

  private store(pet: OwnedPet): OwnedPet {
    if (pet.status === 'pet' && [...this.pets.values()].some((other) => other.id !== pet.id && other.status === 'pet')) {
      throw new ActivePetConflictError();
    }
    const stored = clone(pet);
    const events = new Map<string, OwnedPet['careHistory'][number]>();
    for (const entry of stored.careHistory) {
      const existing = events.get(entry.id);
      if (existing && !isDeepStrictEqual(existing, entry)) {
        throw new Error('Care history event conflicts with its persisted owner or content.');
      }
      events.set(entry.id, entry);
    }
    stored.careHistory = [...events.values()];
    this.pets.set(pet.id, stored);
    return clone(stored);
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
