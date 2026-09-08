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
import { POCKET_PET_REPOSITORY, PocketPetRepository } from './pocket-pet.repository';
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

  async listPets(guestId: string, now: Date = new Date()): Promise<OwnedPet[]> {
    await this.getGuestSession(guestId, now);

    const pets = await this.repository.listPets(guestId);
    const resolvedPets: OwnedPet[] = [];

    for (const pet of pets) {
      resolvedPets.push(await this.resolveAndSave(guestId, pet, now));
    }

    return resolvedPets;
  }

  async createPet(guestId: string, request: unknown, now: Date = new Date()): Promise<OwnedPet> {
    const body = parseRequestBody(request, ['petId', 'sessionLengthId', 'name']);
    const petId = parseCreateablePetId(body['petId']);
    const sessionLengthId = parseSessionLengthId(body['sessionLengthId']);
    const name = parsePetName(body['name']);
    await this.getGuestSession(guestId, now);
    const existingPets = await this.listPets(guestId, now);

    if (existingPets.some((pet: OwnedPet): boolean => pet.status === 'pet')) {
      throw new ConflictException('Guest session already has an active pet.');
    }

    const endsAt = new Date(now.getTime() + SESSION_LENGTH_MINUTES[sessionLengthId] * 60_000);
    const pet: OwnedPet = {
      id: randomUUID(),
      name,
      petId,
      mode: petModeForPetId(petId),
      status: 'pet',
      mood: 'joyful',
      periodOfLife: 'child',
      ...createInitialPetCareState(now),
      sessionLengthId,
      createdAt: now.toISOString(),
      endsAt: endsAt.toISOString()
    };

    return this.repository.createPet(guestId, pet);
  }

  async getPet(guestId: string, petId: string, now: Date = new Date()): Promise<OwnedPet> {
    await this.getGuestSession(guestId, now);
    const pet = await this.repository.getPet(guestId, petId);

    if (!pet) {
      throw new NotFoundException('Pet not found.');
    }

    return this.resolveAndSave(guestId, pet, now);
  }

  async applyCareAction(
    guestId: string,
    petId: string,
    request: unknown,
    now: Date = new Date()
  ): Promise<PetCareActionResult> {
    const body = parseRequestBody(request, ['actionId']);
    const actionId = parseCareActionId(body['actionId']);
    await this.getGuestSession(guestId, now);
    const pet = await this.repository.getPet(guestId, petId);

    if (!pet) {
      throw new NotFoundException('Pet not found.');
    }

    const result = applyPetCareAction(pet, actionId, now);
    await this.repository.savePet(guestId, result.pet);
    return result;
  }

  private async resolveAndSave(guestId: string, pet: OwnedPet, now: Date): Promise<OwnedPet> {
    const resolvedPet = resolvePetState(pet, now);
    return this.repository.savePet(guestId, resolvedPet);
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
