import { GuestSession, OwnedPet } from './pet-domain.types';

export const POCKET_PET_REPOSITORY = Symbol('POCKET_PET_REPOSITORY');

export interface PocketPetRepository {
  getOrCreateGuestSession(guestId: string | null, now: Date): Promise<GuestSession>;
  touchGuestSession(guestId: string, now: Date): Promise<GuestSession | null>;
  listPets(guestId: string): Promise<OwnedPet[]>;
  getPet(guestId: string, petId: string): Promise<OwnedPet | null>;
  createPet(guestId: string, pet: OwnedPet): Promise<OwnedPet>;
  savePet(guestId: string, pet: OwnedPet): Promise<OwnedPet>;
}
