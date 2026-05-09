import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { I18nService } from '../i18n/i18n.service';
import { PET_OPTIONS, SESSION_LENGTHS } from '../pocket-pet/pocket-pet.config';
import { PetOption, SessionLength } from '../pocket-pet/pocket-pet.model';
import { OwnedPet, PetStatus } from '../pets/owned-pet.model';
import { PetStorageService } from '../pets/pet-storage.service';
import { UserService } from '../users/user.service';

@Component({
  selector: 'app-profile',
  imports: [
    RouterLink
  ],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent {
  constructor(
    public readonly i18n: I18nService,
    public readonly pets: PetStorageService,
    public readonly userService: UserService
  ) {}

  petOption(ownedPet: OwnedPet): PetOption {
    return PET_OPTIONS.find((pet: PetOption): boolean => pet.id === ownedPet.petId) ?? PET_OPTIONS[0];
  }

  sessionLength(ownedPet: OwnedPet): SessionLength {
    return SESSION_LENGTHS.find((session: SessionLength): boolean => session.id === ownedPet.sessionLengthId) ?? SESSION_LENGTHS[0];
  }

  statusLabel(status: PetStatus): string {
    if (status === 'resting') {
      return this.i18n.t('petStatusResting');
    }

    if (status === 'needs-care') {
      return this.i18n.t('petStatusNeedsCare');
    }

    return this.i18n.t('petStatusActive');
  }

  formatDate(value: string): string {
    return new Intl.DateTimeFormat(this.i18n.language(), {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(value));
  }
}
