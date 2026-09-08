import { GuestSession, OwnedPet } from './pet-domain.types';

export const POCKET_PET_REPOSITORY = Symbol('POCKET_PET_REPOSITORY');

export class GuestSessionNotFoundError extends Error {}
export class ActivePetConflictError extends Error {}

export interface PocketPetTransaction {
  touchGuestSession(now: Date): Promise<void>;
  listPets(): Promise<OwnedPet[]>;
  getPet(petId: string): Promise<OwnedPet | null>;
  createPet(pet: OwnedPet): Promise<OwnedPet>;
  savePet(pet: OwnedPet): Promise<OwnedPet>;
}

export interface PocketPetRepository {
  createAuthenticatedGuestSession(tokenHash: string, tokenExpiresAt: Date, now: Date): Promise<GuestSession>;
  findGuestSessionByTokenHash(tokenHash: string, now: Date): Promise<GuestSession | null>;
  renewGuestSessionToken(guestId: string, tokenHash: string, tokenExpiresAt: Date, now: Date): Promise<GuestSession | null>;
  getOrCreateGuestSession(guestId: string | null, now: Date): Promise<GuestSession>;
  touchGuestSession(guestId: string, now: Date): Promise<GuestSession | null>;
  withGuestTransaction<T>(guestId: string, operation: (transaction: PocketPetTransaction) => Promise<T>): Promise<T>;
}
