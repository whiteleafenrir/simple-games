import 'reflect-metadata';

import { ConflictException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { GuestSessionsController } from './guest-sessions.controller';
import { InMemoryPocketPetRepository } from './in-memory-pocket-pet.repository';
import { PetsController } from './pets.controller';
import { PocketPetService } from './pocket-pet.service';

function createService(): PocketPetService {
  return new PocketPetService(new InMemoryPocketPetRepository());
}

describe('PocketPetService', () => {
  it('creates and restores a guest session without registration', async () => {
    const service = createService();
    const created = await service.createOrGetGuestSession(null, new Date('2026-06-13T10:00:00.000Z'));
    const restored = await service.createOrGetGuestSession(created.id, new Date('2026-06-13T11:00:00.000Z'));

    expect(restored.id).toBe(created.id);
    expect(restored.createdAt).toBe('2026-06-13T10:00:00.000Z');
    expect(restored.lastSeenAt).toBe('2026-06-13T11:00:00.000Z');
  });

  it('creates one active pet per guest and derives mode on backend', async () => {
    const service = createService();
    const guest = await service.createOrGetGuestSession('guest-1', new Date('2026-06-13T10:00:00.000Z'));
    const pet = await service.createPet(guest.id, {
      name: 'Mila',
      petId: 'dinosaur',
      sessionLengthId: 'standard'
    }, new Date('2026-06-13T10:00:00.000Z'));

    await expect(service.createPet(guest.id, {
      name: 'Second',
      petId: 'cat',
      sessionLengthId: 'short'
    }, new Date('2026-06-13T10:01:00.000Z'))).rejects.toBeInstanceOf(ConflictException);

    expect(pet.mode).toBe('medium');
    expect(pet.status).toBe('pet');
    expect(await service.listPets(guest.id, new Date('2026-06-13T10:02:00.000Z'))).toHaveLength(1);
  });

  it('applies care actions through the service and persists action history', async () => {
    const service = createService();
    const guest = await service.createOrGetGuestSession('guest-2', new Date('2026-06-13T10:00:00.000Z'));
    const pet = await service.createPet(guest.id, {
      name: 'Rex',
      petId: 'cat',
      sessionLengthId: 'standard'
    }, new Date('2026-06-13T10:00:00.000Z'));
    const result = await service.applyCareAction(guest.id, pet.id, {
      actionId: 'play'
    }, new Date('2026-06-13T10:00:00.000Z'));
    const persistedPet = await service.getPet(guest.id, pet.id, new Date('2026-06-13T10:00:00.000Z'));

    expect(result.applied).toBe(true);
    expect(result.pet.playerEnergy.current).toBe(85);
    expect(persistedPet.careHistory).toHaveLength(1);
    expect(persistedPet.lastActionAt.play).toBe('2026-06-13T10:00:00.000Z');
  });

  it('resolves expired active pets before allowing the next pet', async () => {
    const service = createService();
    const guest = await service.createOrGetGuestSession('guest-3', new Date('2026-06-13T10:00:00.000Z'));
    const pet = await service.createPet(guest.id, {
      name: 'Shorty',
      petId: 'cat',
      sessionLengthId: 'short'
    }, new Date('2026-06-13T10:00:00.000Z'));
    const expiredPet = await service.getPet(guest.id, pet.id, new Date('2026-06-14T10:01:00.000Z'));
    const nextPet = await service.createPet(guest.id, {
      name: 'Next',
      petId: 'dog',
      sessionLengthId: 'short'
    }, new Date('2026-06-14T10:02:00.000Z'));

    expect(expiredPet.status).not.toBe('pet');
    expect(expiredPet.farewell).not.toBeNull();
    expect(nextPet.status).toBe('pet');
  });
});

describe('Pocket Pet controllers', () => {
  it('exposes the MVP API contract over controller methods', async () => {
    const service = createService();
    const guestSessionsController = new GuestSessionsController(service);
    const petsController = new PetsController(service);
    const session = await guestSessionsController.createOrGetGuestSession({});
    const pet = await petsController.createPet(session.id, {
      name: 'Api Rex',
      petId: 'cat',
      sessionLengthId: 'standard'
    });
    const result = await petsController.applyCareAction(session.id, pet.id, {
      actionId: 'feed'
    });

    expect(await petsController.listPets(session.id)).toHaveLength(1);
    expect(await petsController.getPet(session.id, pet.id)).toMatchObject({
      id: pet.id,
      name: 'Api Rex'
    });
    expect(result).toMatchObject({
      applied: true,
      actionId: 'feed'
    });
  });
});
