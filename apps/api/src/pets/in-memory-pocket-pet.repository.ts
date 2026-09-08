import { randomUUID } from 'node:crypto';

import { GuestSession, OwnedPet } from './pet-domain.types';
import { PocketPetRepository } from './pocket-pet.repository';

interface StoredPet {
  guestId: string;
  pet: OwnedPet;
}

export class InMemoryPocketPetRepository implements PocketPetRepository {
  private readonly sessions = new Map<string, GuestSession>();
  private readonly pets = new Map<string, StoredPet>();
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

  async listPets(guestId: string): Promise<OwnedPet[]> {
    return [...this.pets.values()]
      .filter((storedPet: StoredPet): boolean => storedPet.guestId === guestId)
      .map((storedPet: StoredPet): OwnedPet => clone(storedPet.pet))
      .sort((left: OwnedPet, right: OwnedPet): number => Date.parse(right.createdAt) - Date.parse(left.createdAt));
  }

  async getPet(guestId: string, petId: string): Promise<OwnedPet | null> {
    const storedPet = this.pets.get(petId);

    if (!storedPet || storedPet.guestId !== guestId) {
      return null;
    }

    return clone(storedPet.pet);
  }

  async createPet(guestId: string, pet: OwnedPet): Promise<OwnedPet> {
    this.pets.set(pet.id, {
      guestId,
      pet: clone(pet)
    });
    return clone(pet);
  }

  async savePet(guestId: string, pet: OwnedPet): Promise<OwnedPet> {
    const storedPet = this.pets.get(pet.id);

    if (!storedPet || storedPet.guestId !== guestId) {
      throw new Error(`Pet ${pet.id} does not belong to guest session ${guestId}.`);
    }

    this.pets.set(pet.id, {
      guestId,
      pet: clone(pet)
    });
    return clone(pet);
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
