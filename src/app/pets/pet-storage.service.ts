import { Injectable, effect, signal } from '@angular/core';

import { PetOption, SessionLength } from '../pocket-pet/pocket-pet.model';
import { UserService } from '../users/user.service';
import { OwnedPet } from './owned-pet.model';

@Injectable({
  providedIn: 'root'
})
export class PetStorageService {
  readonly pets = signal<OwnedPet[]>([]);

  constructor(private readonly userService: UserService) {
    this.pets.set(this.readPets());

    effect((): void => {
      this.writePets(this.pets());
    });
  }

  addPet(pet: PetOption, sessionLength: SessionLength): OwnedPet {
    const now = new Date();
    const endsAt = new Date(now.getTime() + sessionLength.minutes * 60_000);
    const ownedPet: OwnedPet = {
      id: `${pet.id}-${now.getTime()}`,
      petId: pet.id,
      mode: pet.mode,
      status: 'active',
      sessionLengthId: sessionLength.id,
      createdAt: now.toISOString(),
      endsAt: endsAt.toISOString()
    };

    this.pets.update((pets: OwnedPet[]): OwnedPet[] => [ownedPet, ...pets]);
    return ownedPet;
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
      const parsedPets = JSON.parse(rawPets) as OwnedPet[];
      return Array.isArray(parsedPets) ? parsedPets : [];
    } catch {
      return [];
    }
  }

  private writePets(pets: OwnedPet[]): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(this.storageKey(), JSON.stringify(pets));
  }
}
