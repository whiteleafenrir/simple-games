import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { I18nService } from '../i18n/i18n.service';
import { PetStorageService } from '../pets/pet-storage.service';
import { PET_OPTIONS, SESSION_LENGTHS } from './pocket-pet.config';
import { PetOption, SessionLength } from './pocket-pet.model';

@Component({
  selector: 'app-pocket-pet',
  imports: [
    RouterLink
  ],
  templateUrl: './pocket-pet.component.html',
  styleUrls: ['./pocket-pet.component.css']
})
export class PocketPetComponent {
  readonly sessionLengths: readonly SessionLength[] = SESSION_LENGTHS;
  readonly petOptions: readonly PetOption[] = PET_OPTIONS;
  readonly selectedSession = signal<SessionLength>(SESSION_LENGTHS[1]);
  readonly selectedPet = signal<PetOption>(PET_OPTIONS[0]);
  readonly petName = signal<string>('');
  readonly createdPetMessage = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly canCreatePet = computed((): boolean => this.petName().trim().length > 0 && !this.petStorage.activePet());

  constructor(
    public readonly i18n: I18nService,
    public readonly petStorage: PetStorageService
  ) {}

  selectSession(sessionLength: SessionLength): void {
    this.selectedSession.set(sessionLength);
    this.createdPetMessage.set(null);
    this.errorMessage.set(null);
  }

  selectPet(pet: PetOption): void {
    if (pet.disabled) {
      return;
    }

    this.selectedPet.set(pet);
    this.createdPetMessage.set(null);
    this.errorMessage.set(null);
  }

  updatePetName(name: string): void {
    this.petName.set(name);
    this.createdPetMessage.set(null);
    this.errorMessage.set(null);
  }

  createPet(): void {
    const name = this.petName().trim();

    if (!name) {
      this.errorMessage.set(this.i18n.t('petNameRequired'));
      return;
    }

    const ownedPet = this.petStorage.addPet(this.selectedPet(), this.selectedSession(), name);

    if (!ownedPet) {
      this.errorMessage.set(this.i18n.t('activePetExists'));
      return;
    }

    this.petName.set('');
    this.createdPetMessage.set(this.i18n.t('petCreated'));
    this.errorMessage.set(null);
  }

  sessionDurationLabel(sessionLength: SessionLength): string {
    if (sessionLength.minutes % 1440 === 0) {
      return `${sessionLength.minutes / 1440} ${this.i18n.t('dayShort')}`;
    }

    if (sessionLength.minutes % 60 === 0) {
      return `${sessionLength.minutes / 60} ${this.i18n.t('hourShort')}`;
    }

    return `${sessionLength.minutes} ${this.i18n.t('minutesShort')}`;
  }
}
