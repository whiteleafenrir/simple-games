import { Injectable, OnDestroy, computed, effect, signal } from '@angular/core';

import { PetOption, SessionLength } from '../pocket-pet/pocket-pet.model';
import { UserService } from '../users/user.service';
import { createInitialPetCareState, applyPetCareAction, resolvePetState } from './pet-engine';
import { OwnedPet, PetCareActionId, PetCareActionResult } from './owned-pet.model';
import { deserializePets, serializePets } from './pet-storage.migrations';

@Injectable({
  providedIn: 'root'
})
export class PetStorageService implements OnDestroy {
  readonly pets = signal<OwnedPet[]>([]);
  readonly activePet = computed((): OwnedPet | null => this.findActivePet(this.pets()));
  private readonly timerId: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly userService: UserService) {
    this.pets.set(this.readPets());

    effect((): void => {
      this.writePets(this.pets());
    });

    if (typeof setInterval !== 'undefined') {
      this.timerId = setInterval((): void => this.resolvePets(), 60_000);
    }
  }

  ngOnDestroy(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
    }
  }

  addPet(pet: PetOption, sessionLength: SessionLength, name: string): OwnedPet | null {
    if (this.activePet()) {
      return null;
    }

    const now = new Date();
    const endsAt = new Date(now.getTime() + sessionLength.minutes * 60_000);
    const ownedPet: OwnedPet = {
      id: `${pet.id}-${now.getTime()}`,
      name: name.trim(),
      petId: pet.id,
      mode: pet.mode,
      status: 'pet',
      mood: 'joyful',
      periodOfLife: 'child',
      ...createInitialPetCareState(now),
      sessionLengthId: sessionLength.id,
      createdAt: now.toISOString(),
      endsAt: endsAt.toISOString()
    };

    this.pets.update((pets: OwnedPet[]): OwnedPet[] => [ownedPet, ...pets]);
    return ownedPet;
  }

  careForPet(id: string, actionId: PetCareActionId, now: Date = new Date()): PetCareActionResult | null {
    const pet = this.petById(id);

    if (!pet) {
      return null;
    }

    const result = applyPetCareAction(pet, actionId, now);
    this.replacePet(result.pet);
    return result;
  }

  resolvePets(now: Date = new Date()): void {
    this.pets.update((pets: OwnedPet[]): OwnedPet[] => pets.map((pet: OwnedPet): OwnedPet => resolvePetState(pet, now)));
  }

  petById(id: string | null): OwnedPet | null {
    if (!id) {
      return null;
    }

    return this.pets().find((pet: OwnedPet): boolean => pet.id === id) ?? null;
  }

  private storageKey(): string {
    return `simple-games:${this.userService.currentUser().id}:pets`;
  }

  private readPets(): OwnedPet[] {
    if (typeof localStorage === 'undefined') {
      return [];
    }

    const rawPets: string | null = localStorage.getItem(this.storageKey());

    if (!rawPets) {
      return [];
    }

    return deserializePets(rawPets);
  }

  private writePets(pets: OwnedPet[]): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(this.storageKey(), serializePets(pets));
  }

  private findActivePet(pets: OwnedPet[]): OwnedPet | null {
    return pets.find((pet: OwnedPet): boolean => pet.status === 'pet') ?? null;
  }

  private replacePet(updatedPet: OwnedPet): void {
    this.pets.update((pets: OwnedPet[]): OwnedPet[] =>
      pets.map((pet: OwnedPet): OwnedPet => pet.id === updatedPet.id ? updatedPet : pet)
    );
  }
}
