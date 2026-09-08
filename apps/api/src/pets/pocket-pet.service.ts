import { Inject, Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import {
  GuestSession,
  OwnedPet,
  PetCareActionId,
  PetCareActionResult,
  PetId,
  PetMode,
  SessionLengthId
} from './pet-domain.types';
import { applyPetCareAction, createInitialPetCareState, PET_CARE_ACTION_IDS, resolvePetState } from './pet-engine';
import { ActivePetConflictError, GuestSessionNotFoundError, POCKET_PET_REPOSITORY, PocketPetRepository, PocketPetTransaction } from './pocket-pet.repository';
import { parseRequestBody } from './request-body';

const CREATEABLE_PET_IDS: readonly PetId[] = ['cat', 'dog', 'parrot', 'dinosaur'] as const;
const SESSION_LENGTH_MINUTES: Record<SessionLengthId, number> = {
  short: 1440,
  standard: 4320,
  long: 10080
};

@Injectable()
export class PocketPetService {
  constructor(
    @Inject(POCKET_PET_REPOSITORY)
    private readonly repository: PocketPetRepository
  ) {}

  async createOrGetGuestSession(guestId: unknown, now: Date = new Date()): Promise<GuestSession> {
    return this.repository.getOrCreateGuestSession(normalizeGuestId(guestId), now);
  }

  async getGuestSession(guestId: string, now: Date = new Date()): Promise<GuestSession> {
    const session = await this.repository.touchGuestSession(guestId, now);

    if (!session) {
      throw new NotFoundException('Guest session not found.');
    }

    return session;
  }

  listPets(guestId: string, now?: Date): Promise<OwnedPet[]> {
    return this.withGuestTransaction(guestId, now, (tx, at) => this.resolvePets(tx, at));
  }

  private async resolvePets(tx: PocketPetTransaction, now: Date): Promise<OwnedPet[]> {
    const pets = await tx.listPets();
    const resolvedPets: OwnedPet[] = [];

    for (const pet of pets) {
      resolvedPets.push(await tx.savePet(resolvePetState(pet, now)));
    }

    return resolvedPets;
  }

  async createPet(guestId: string, request: unknown, now?: Date): Promise<OwnedPet> {
    const body = parseRequestBody(request, ['petId', 'sessionLengthId', 'name']);
    const petId = parseCreateablePetId(body['petId']);
    const sessionLengthId = parseSessionLengthId(body['sessionLengthId']);
    const name = parsePetName(body['name']);
    return this.withGuestTransaction(guestId, now, async (tx, at) => {
      const existingPets = await this.resolvePets(tx, at);

      if (existingPets.some((pet: OwnedPet): boolean => pet.status === 'pet')) {
        throw new ActivePetConflictError();
      }

      const endsAt = new Date(at.getTime() + SESSION_LENGTH_MINUTES[sessionLengthId] * 60_000);
      const pet: OwnedPet = {
        id: randomUUID(),
        name,
        petId,
        mode: petModeForPetId(petId),
        status: 'pet',
        mood: 'joyful',
        periodOfLife: 'child',
        ...createInitialPetCareState(at),
        sessionLengthId,
        createdAt: at.toISOString(),
        endsAt: endsAt.toISOString()
      };

      return tx.createPet(pet);
    });
  }

  getPet(guestId: string, petId: string, now?: Date): Promise<OwnedPet> {
    return this.withGuestTransaction(guestId, now, async (tx, at) => {
      const pet = await tx.getPet(petId);

      if (!pet) {
        throw new NotFoundException('Pet not found.');
      }

      return tx.savePet(resolvePetState(pet, at));
    });
  }

  async applyCareAction(
    guestId: string,
    petId: string,
    request: unknown,
    now?: Date
  ): Promise<PetCareActionResult> {
    const body = parseRequestBody(request, ['actionId']);
    const actionId = parseCareActionId(body['actionId']);
    return this.withGuestTransaction(guestId, now, async (tx, at) => {
      const pet = await tx.getPet(petId);

      if (!pet) {
        throw new NotFoundException('Pet not found.');
      }

      const result = applyPetCareAction(pet, actionId, at);
      await tx.savePet(result.pet);
      return result;
    });
  }

  private async withGuestTransaction<T>(
    guestId: string,
    now: Date | undefined,
    operation: (tx: PocketPetTransaction, at: Date) => Promise<T>
  ): Promise<T> {
    try {
      return await this.repository.withGuestTransaction(guestId, async (tx) => {
        const at = now ?? new Date();
        await tx.touchGuestSession(at);
        return operation(tx, at);
      });
    } catch (error) {
      if (error instanceof GuestSessionNotFoundError) {
        throw new NotFoundException('Guest session not found.');
      }
      if (error instanceof ActivePetConflictError) {
        throw new ConflictException('Guest session already has an active pet.');
      }
      throw error;
    }
  }
}

function normalizeGuestId(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const guestId = value.trim();
  return guestId.length > 0 ? guestId : null;
}

function parsePetName(value: unknown): string {
  if (typeof value !== 'string') {
    throw new BadRequestException('Pet name is required.');
  }

  const name = value.trim();

  if (!name) {
    throw new BadRequestException('Pet name is required.');
  }

  if (name.length > 32) {
    throw new BadRequestException('Pet name must be 32 characters or fewer.');
  }

  return name;
}

function parseCreateablePetId(value: unknown): PetId {
  if (CREATEABLE_PET_IDS.includes(value as PetId)) {
    return value as PetId;
  }

  throw new BadRequestException('Pet species is not available in MVP.');
}

function parseSessionLengthId(value: unknown): SessionLengthId {
  if (value === 'short' || value === 'standard' || value === 'long') {
    return value;
  }

  throw new BadRequestException('Session length is invalid.');
}

function parseCareActionId(value: unknown): PetCareActionId {
  if (PET_CARE_ACTION_IDS.includes(value as PetCareActionId)) {
    return value as PetCareActionId;
  }

  throw new BadRequestException('Care action is invalid.');
}

function petModeForPetId(petId: PetId): PetMode {
  if (petId === 'dinosaur') {
    return 'medium';
  }

  if (petId === 'dragon') {
    return 'insane';
  }

  return 'easy';
}
