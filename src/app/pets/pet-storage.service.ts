import { DOCUMENT } from '@angular/common';
import { Injectable, OnDestroy, computed, inject, signal } from '@angular/core';
import { TranslationKey } from '../i18n/translations';
import { PetOption, SessionLength } from '../pocket-pet/pocket-pet.model';
import { PetSnapshot, PetCareActionId, PetCareActionResponse, PetHistoryPage } from './owned-pet.model';
import { PetApiService } from './pet-api.service';
import { petErrorKey } from './pet-error.utils';
import type { PetQuestionHistoryPage, PetQuestionResponse, QuestionLanguage } from '@simple-games/pet-contract';

@Injectable({ providedIn: 'root' })
export class PetStorageService implements OnDestroy {
  readonly pets = signal<PetSnapshot[]>([]);
  readonly activePet = computed(() => this.pets().find(pet => pet.status === 'pet') ?? null);
  readonly guestId = signal<string | null>(null);
  readonly loading = signal(true);
  readonly refreshing = signal(false);
  readonly commandPending = signal(false);
  readonly syncError = signal<TranslationKey | null>(null);
  readonly commandError = signal<TranslationKey | null>(null);

  private readonly document = inject(DOCUMENT);
  private readonly timerId: ReturnType<typeof setInterval>;
  private queue: Promise<void> = Promise.resolve();
  private refreshPromise: Promise<void> | null = null;
  private destroyed = false;
  private readonly onVisibilityChange = (): void => {
    if (!this.document.hidden) void this.resolvePets();
  };

  constructor(private readonly petApi: PetApiService) {
    void this.resolvePets();
    this.timerId = setInterval(() => {
      if (!this.document.hidden && !this.commandPending()) void this.resolvePets();
    }, 30_000);
    this.document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    clearInterval(this.timerId);
    this.document.removeEventListener('visibilitychange', this.onVisibilityChange);
  }

  ready(): Promise<void> { return this.refreshPromise ?? Promise.resolve(); }

  resolvePets(): Promise<void> {
    if (this.destroyed) return Promise.resolve();
    if (this.refreshPromise) return this.refreshPromise;
    this.refreshing.set(true);
    const request = this.enqueue(async () => {
      try {
        const guestId = await this.ensureGuestId();
        const pets = await this.petApi.getPets(guestId);
        if (!this.destroyed) { this.pets.set(pets); this.syncError.set(null); }
      } catch (error) {
        if (!this.destroyed) this.syncError.set(petErrorKey(error));
      } finally {
        if (!this.destroyed) { this.loading.set(false); this.refreshing.set(false); }
      }
    });
    this.refreshPromise = request;
    void request.finally(() => { if (this.refreshPromise === request) this.refreshPromise = null; });
    return request;
  }

  async addPet(pet: PetOption, sessionLength: SessionLength, name: string): Promise<PetSnapshot | null> {
    return this.command(async guestId => {
      const ownedPet = await this.petApi.createPet(guestId, pet, sessionLength, name.trim());
      if (!this.destroyed) this.pets.update(pets => [ownedPet, ...pets.filter(item => item.id !== ownedPet.id)]);
      return ownedPet;
    });
  }

  async careForPet(id: string, actionId: PetCareActionId): Promise<PetCareActionResponse | null> {
    return this.command(async guestId => {
      const result = await this.petApi.applyCareAction(guestId, id, actionId);
      if (!this.destroyed) this.pets.update(pets => pets.map(pet => pet.id === result.pet.id ? result.pet : pet));
      return result;
    });
  }

  async getHistory(petId: string, cursor: string | null): Promise<PetHistoryPage> {
    await this.ready();
    const guestId = this.guestId();
    if (!guestId) throw new Error('Guest session unavailable.');
    return this.petApi.getHistory(guestId, petId, cursor);
  }

  petById(id: string | null): PetSnapshot | null {
    return this.pets().find(pet => pet.id === id) ?? null;
  }

  startQuestion(petId: string, language: QuestionLanguage): Promise<PetQuestionResponse | null> {
    return this.questionCommand(guestId => this.petApi.startQuestion(guestId, petId, language));
  }

  answerQuestion(petId: string, attemptId: string, optionId: string | null): Promise<PetQuestionResponse | null> {
    return this.questionCommand(guestId => this.petApi.answerQuestion(guestId, petId, attemptId, optionId));
  }

  async getQuestionHistory(petId: string, cursor: string | null): Promise<PetQuestionHistoryPage> {
    await this.ready();
    const guestId = this.guestId();
    if (!guestId) throw new Error('Guest session unavailable.');
    return this.petApi.getQuestionHistory(guestId, petId, cursor);
  }

  private questionCommand(operation: (guestId: string) => Promise<PetQuestionResponse>): Promise<PetQuestionResponse | null> {
    return this.command(async guestId => {
      const result = await operation(guestId);
      if (!this.destroyed) this.pets.update(pets => pets.map(pet => pet.id === result.pet.id ? result.pet : pet));
      return result;
    });
  }

  private async command<T>(operation: (guestId: string) => Promise<T>): Promise<T | null> {
    if (this.commandPending() || this.destroyed) return null;
    // Set before the first await, so double clicks cannot enqueue another command.
    this.commandPending.set(true);
    try {
      return await this.enqueue(async () => {
        try {
          const result = await operation(await this.ensureGuestId());
          if (!this.destroyed) this.commandError.set(null);
          return result;
        } catch (error) {
          if (!this.destroyed) this.commandError.set(petErrorKey(error));
          // Reconcile a possible committed command after a lost response; keep its error visible.
          void this.resolvePets();
          return null;
        }
      });
    } finally {
      if (!this.destroyed) this.commandPending.set(false);
    }
  }

  private async ensureGuestId(): Promise<string> {
    const current = this.guestId();
    if (current) return current;
    const session = await this.petApi.createOrGetGuestSession();
    if (!this.destroyed) this.guestId.set(session.id);
    return session.id;
  }

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.queue.then(operation);
    this.queue = result.then(() => undefined, () => undefined);
    return result;
  }
}
