import { Injectable, OnDestroy, computed, signal } from '@angular/core';

import { PetOption, SessionLength } from '../pocket-pet/pocket-pet.model';
import { OwnedPet, PetCareActionId, PetCareActionResult } from './owned-pet.model';
import { PetApiService } from './pet-api.service';

@Injectable({
  providedIn: 'root'
})
export class PetStorageService implements OnDestroy {
  readonly pets = signal<OwnedPet[]>([]);
  readonly activePet = computed((): OwnedPet | null => this.findActivePet(this.pets()));
  readonly guestId = signal<string | null>(null);
  readonly loading = signal<boolean>(true);
  readonly syncError = signal<string | null>(null);

  private readonly timerId: ReturnType<typeof setInterval> | null = null;
  private initialization: Promise<void> | null = null;

  constructor(private readonly petApi: PetApiService) {
    void this.startInitialization();

    if (typeof setInterval !== 'undefined') {
      this.timerId = setInterval((): void => {
        void this.resolvePets();
      }, 60_000);
    }
  }

  ngOnDestroy(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
    }
  }

  ready(): Promise<void> {
    return this.initialization ?? Promise.resolve();
  }

  async addPet(pet: PetOption, sessionLength: SessionLength, name: string): Promise<OwnedPet | null> {
    const guestId = await this.ensureGuestId();

    if (!guestId || this.activePet()) {
      return null;
    }

    try {
      const ownedPet = await this.petApi.createPet(guestId, pet, sessionLength, name.trim());
      this.pets.update((pets: OwnedPet[]): OwnedPet[] => [ownedPet, ...pets]);
      this.syncError.set(null);
      return ownedPet;
    } catch (error) {
      this.recordSyncError(error);
      await this.resolvePets();
      return null;
    }
  }

  async careForPet(id: string, actionId: PetCareActionId): Promise<PetCareActionResult | null> {
    const guestId = await this.ensureGuestId();

    if (!guestId) {
      return null;
    }

    try {
      const result = await this.petApi.applyCareAction(guestId, id, actionId);
      this.replacePet(result.pet);
      this.syncError.set(null);
      return result;
    } catch (error) {
      this.recordSyncError(error);
      await this.resolvePets();
      return null;
    }
  }

  async resolvePets(): Promise<void> {
    const guestId = await this.ensureGuestId();

    if (!guestId) {
      return;
    }

    await this.loadPets(guestId);
  }

  petById(id: string | null): OwnedPet | null {
    if (!id) {
      return null;
    }

    return this.pets().find((pet: OwnedPet): boolean => pet.id === id) ?? null;
  }

  private async startInitialization(): Promise<void> {
    const initialization = this.initialize();
    this.initialization = initialization;

    await initialization.finally((): void => {
      if (this.initialization === initialization) {
        this.initialization = null;
      }
    });
  }

  private async initialize(): Promise<void> {
    this.loading.set(true);

    try {
      const session = await this.petApi.createOrGetGuestSession();
      this.guestId.set(session.id);
      await this.loadPets(session.id);
      this.syncError.set(null);
    } catch (error) {
      this.recordSyncError(error);
    } finally {
      this.loading.set(false);
    }
  }

  private async ensureGuestId(): Promise<string | null> {
    if (this.initialization) {
      await this.initialization;
    }

    const currentGuestId = this.guestId();

    if (currentGuestId) {
      return currentGuestId;
    }

    await this.startInitialization();
    return this.guestId();
  }

  private async loadPets(guestId: string): Promise<void> {
    try {
      this.pets.set(await this.petApi.getPets(guestId));
      this.syncError.set(null);
    } catch (error) {
      this.recordSyncError(error);
    }
  }

  private recordSyncError(error: unknown): void {
    this.syncError.set(error instanceof Error ? error.message : 'sync-failed');
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
