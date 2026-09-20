import { randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';

import { GuestSession, OwnedPet, PetCareActionEntry, PetHistoryCursor } from './pet-domain.types';
import { ActivePetConflictError, GuestSessionNotFoundError, PocketPetRepository, PocketPetTransaction } from './pocket-pet.repository';
import { StoredQuestionAttempt } from './pet-question-attempt';

interface StoredPet {
  guestId: string;
  pet: OwnedPet;
}

interface StoredEvent { petId: string; entry: PetCareActionEntry; }

export class InMemoryPocketPetRepository implements PocketPetRepository {
  private readonly events = new Map<string, StoredEvent>();
  private readonly questions = new Map<string, StoredQuestionAttempt>();
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
      const questions = new Map([...this.questions].filter(([, attempt]) => pets.has(attempt.petId)).map(([id, attempt]) => [id, clone(attempt)]));
      const tx = new MemoryPetTransaction(clone(session), pets, new Map(this.events), questions);
      const result = await operation(tx);
      for (const [id, event] of tx.addedEvents) {
        const existing = this.events.get(id);
        if (existing && !isDeepStrictEqual(existing, event)) throw new Error('Care history event conflicts with its persisted owner or content.');
      }
      for (const [id, event] of tx.addedEvents) this.events.set(id, clone(event));
      for (const [id, attempt] of questions) this.questions.set(id, clone(attempt));
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
  readonly addedEvents = new Map<string, StoredEvent>();
  constructor(public session: GuestSession, private readonly pets: Map<string, OwnedPet>, private readonly events: Map<string, StoredEvent>, private readonly questions: Map<string, StoredQuestionAttempt>) {}

  async touchGuestSession(now: Date): Promise<void> {
    this.session = { ...this.session, lastSeenAt: now.toISOString() };
  }

  async listPets(): Promise<OwnedPet[]> {
    return [...this.pets.values()].map(clone)
      .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt) || right.id.localeCompare(left.id));
  }

  async getPet(petId: string): Promise<OwnedPet | null> {
    const pet = this.pets.get(petId);
    return pet ? clone(pet) : null;
  }

  async listHistory(petId: string, cursor: PetHistoryCursor | null, limit: number): Promise<PetCareActionEntry[]> {
    if (!this.pets.has(petId)) return [];
    return [...this.events.values()].filter(event => event.petId === petId).map(event => event.entry)
      .filter(entry => !cursor || entry.appliedAt < cursor.appliedAt || (entry.appliedAt === cursor.appliedAt && entry.id < cursor.id))
      .sort((left, right) => Date.parse(right.appliedAt) - Date.parse(left.appliedAt) || (right.id < left.id ? -1 : right.id > left.id ? 1 : 0))
      .slice(0, limit).map(clone);
  }

  async createPet(pet: OwnedPet): Promise<OwnedPet> {
    if (this.pets.has(pet.id) || pet.careHistoryCount !== 0) throw new Error('Invalid new pet.');
    return this.store(pet);
  }

  async savePet(pet: OwnedPet, entry: PetCareActionEntry | null = null): Promise<OwnedPet> {
    const previous = this.pets.get(pet.id);
    if (!previous) throw new Error('Pet does not belong to the transaction guest.');
    let added = 0;
    if (entry) {
      const event = { petId: pet.id, entry };
      const existing = this.events.get(entry.id);
      if (existing && !isDeepStrictEqual(existing, event)) throw new Error('Care history event conflicts with its persisted owner or content.');
      if (!existing) {
        this.events.set(entry.id, clone(event)); this.addedEvents.set(entry.id, clone(event)); added = 1;
      }
    }
    if (pet.careHistoryCount !== previous.careHistoryCount + added) throw new Error('Care history count does not match appended events.');
    if (previous.farewell && !isDeepStrictEqual(previous.farewell, pet.farewell)) throw new Error('A persisted farewell is immutable.');
    return this.store(pet);
  }

  private store(pet: OwnedPet): OwnedPet {
    if (pet.status === 'pet' && [...this.pets.values()].some(other => other.id !== pet.id && other.status === 'pet')) throw new ActivePetConflictError();
    this.pets.set(pet.id, clone(pet));
    return clone(pet);
  }

  async latestQuestion(petId: string): Promise<StoredQuestionAttempt | null> {
    const attempts = [...this.questions.values()].filter(attempt => attempt.petId === petId && this.pets.has(petId))
      .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt) || b.id.localeCompare(a.id));
    return attempts[0] ? clone(attempts[0]) : null;
  }

  async getQuestion(petId: string, attemptId: string): Promise<StoredQuestionAttempt | null> {
    const attempt = this.questions.get(attemptId);
    return attempt?.petId === petId && this.pets.has(petId) ? clone(attempt) : null;
  }

  async askedQuestionIds(petId: string): Promise<string[]> {
    return [...new Set([...this.questions.values()].filter(attempt => attempt.petId === petId && this.pets.has(petId)).map(attempt => attempt.questionId))];
  }

  async saveQuestion(attempt: StoredQuestionAttempt): Promise<void> {
    if (!this.pets.has(attempt.petId)) throw new Error('Question pet does not belong to guest.');
    const previous = this.questions.get(attempt.id);
    if (previous && (previous.petId !== attempt.petId || (previous.completedAt && !isDeepStrictEqual(previous, attempt)))) {
      throw new Error('A completed question is immutable.');
    }
    if (!attempt.completedAt && [...this.questions.values()].some(other => other.petId === attempt.petId && other.id !== attempt.id && !other.completedAt)) {
      throw new Error('Only one pending question is allowed.');
    }
    this.questions.set(attempt.id, clone(attempt));
  }

  async questionHistory(petId: string, cursor: PetHistoryCursor | null, limit: number): Promise<StoredQuestionAttempt[]> {
    return [...this.questions.values()].filter(attempt => attempt.petId === petId && this.pets.has(petId) && attempt.completedAt)
      .filter(attempt => !cursor || attempt.completedAt! < cursor.appliedAt || (attempt.completedAt === cursor.appliedAt && attempt.id < cursor.id))
      .sort((a, b) => b.completedAt!.localeCompare(a.completedAt!) || b.id.localeCompare(a.id)).slice(0, limit).map(clone);
  }
}

function clone<T>(value: T): T {
  return structuredClone(value);
}
