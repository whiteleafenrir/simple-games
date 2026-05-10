import { Injectable, effect, signal } from '@angular/core';

import { PetOption, SessionLength } from '../pocket-pet/pocket-pet.model';
import { UserService } from '../users/user.service';
import { OwnedPet, PetMood, PetPeriodOfLife, PetStatus } from './owned-pet.model';

const PET_STORAGE_VERSION = '0.1.1';

interface StoredPets {
  version: string;
  pets: Partial<OwnedPet>[];
}

@Injectable({
  providedIn: 'root'
})
export class PetStorageService {
  readonly pets = signal<OwnedPet[]>([]);
  readonly activePet = signal<OwnedPet | null>(null);

  constructor(private readonly userService: UserService) {
    this.pets.set(this.readPets());
    this.activePet.set(this.findActivePet(this.pets()));

    effect((): void => {
      const pets = this.pets();
      this.activePet.set(this.findActivePet(pets));
      this.writePets(pets);
    });
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
      sessionLengthId: sessionLength.id,
      createdAt: now.toISOString(),
      endsAt: endsAt.toISOString()
    };

    this.pets.update((pets: OwnedPet[]): OwnedPet[] => [ownedPet, ...pets]);
    return ownedPet;
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

    try {
      const parsedPets = JSON.parse(rawPets) as Partial<StoredPets>;

      if (parsedPets.version !== PET_STORAGE_VERSION || !Array.isArray(parsedPets.pets)) {
        return [];
      }

      return parsedPets.pets.map((pet: Partial<OwnedPet>): OwnedPet => this.normalizePet(pet));
    } catch {
      return [];
    }
  }

  private writePets(pets: OwnedPet[]): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(this.storageKey(), JSON.stringify({
      version: PET_STORAGE_VERSION,
      pets
    }));
  }

  private findActivePet(pets: OwnedPet[]): OwnedPet | null {
    return pets.find((pet: OwnedPet): boolean => pet.status === 'pet') ?? null;
  }

  private normalizePet(pet: Partial<OwnedPet>): OwnedPet {
    return {
      id: pet.id ?? `pet-${Date.now()}`,
      name: pet.name?.trim() || 'Pocket Pet',
      petId: pet.petId ?? 'cat',
      mode: pet.mode ?? 'easy',
      status: this.normalizeStatus(pet.status),
      mood: this.normalizeMood(pet.mood),
      periodOfLife: this.normalizePeriodOfLife(pet.periodOfLife),
      sessionLengthId: pet.sessionLengthId ?? 'standard',
      createdAt: pet.createdAt ?? new Date().toISOString(),
      endsAt: pet.endsAt ?? new Date().toISOString()
    };
  }

  private normalizeStatus(status: PetStatus | 'active' | 'resting' | 'needs-care' | undefined): PetStatus {
    if (status === 'grown' || status === 'left') {
      return status;
    }

    return 'pet';
  }

  private normalizeMood(mood: PetMood | undefined): PetMood {
    if (mood === 'neutral' || mood === 'angry' || mood === 'upset' || mood === 'thoughtful' || mood === 'irritated') {
      return mood;
    }

    return 'joyful';
  }

  private normalizePeriodOfLife(periodOfLife: PetPeriodOfLife | undefined): PetPeriodOfLife {
    if (periodOfLife === 'child' || periodOfLife === 'adult') {
      return periodOfLife;
    }

    return 'teen';
  }
}
