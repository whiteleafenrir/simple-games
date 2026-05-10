import { Component, computed } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { I18nService } from '../i18n/i18n.service';
import { PET_OPTIONS, SESSION_LENGTHS } from '../pocket-pet/pocket-pet.config';
import { PetOption, SessionLength } from '../pocket-pet/pocket-pet.model';
import { OwnedPet, PetMood, PetPeriodOfLife, PetStatus } from '../pets/owned-pet.model';
import { PetStorageService } from '../pets/pet-storage.service';

@Component({
  selector: 'app-pet-profile',
  imports: [
    RouterLink
  ],
  templateUrl: './pet-profile.component.html',
  styleUrls: ['./pet-profile.component.css']
})
export class PetProfileComponent {
  readonly pet = computed((): OwnedPet | null => this.pets.petById(this.route.snapshot.paramMap.get('petId')));

  constructor(
    public readonly i18n: I18nService,
    private readonly route: ActivatedRoute,
    private readonly pets: PetStorageService
  ) {}

  petOption(ownedPet: OwnedPet): PetOption {
    return PET_OPTIONS.find((pet: PetOption): boolean => pet.id === ownedPet.petId) ?? PET_OPTIONS[0];
  }

  sessionLength(ownedPet: OwnedPet): SessionLength {
    return SESSION_LENGTHS.find((session: SessionLength): boolean => session.id === ownedPet.sessionLengthId) ?? SESSION_LENGTHS[0];
  }

  statusLabel(status: PetStatus): string {
    if (status === 'grown') {
      return this.i18n.t('petStatusGrown');
    }

    if (status === 'left') {
      return this.i18n.t('petStatusLeft');
    }

    return this.i18n.t('petStatusPet');
  }

  moodLabel(mood: PetMood): string {
    return this.i18n.t(`petMood${this.capitalize(mood)}`);
  }

  periodOfLifeLabel(periodOfLife: PetPeriodOfLife): string {
    if (periodOfLife === 'child') {
      return this.i18n.t('petPeriodChild');
    }

    if (periodOfLife === 'adult') {
      return this.i18n.t('petPeriodAdult');
    }

    return this.i18n.t('petPeriodTeen');
  }

  formatDate(value: string): string {
    return new Intl.DateTimeFormat(this.i18n.language(), {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(value));
  }

  private capitalize(value: PetMood): Capitalize<PetMood> {
    return `${value.charAt(0).toUpperCase()}${value.slice(1)}` as Capitalize<PetMood>;
  }
}
