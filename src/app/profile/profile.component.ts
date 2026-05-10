import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { I18nService } from '../i18n/i18n.service';
import { OwnedPet, PetMood, PetPeriodOfLife, PetStatus } from '../pets/owned-pet.model';
import { petMoodKey, petOption, petPeriodOfLifeKey, petStatusKey, sessionLength } from '../pets/pet-display.utils';
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

  readonly petOption = petOption;
  readonly sessionLength = sessionLength;

  statusLabel(status: PetStatus): string {
    return this.i18n.t(petStatusKey(status));
  }

  moodLabel(mood: PetMood): string {
    return this.i18n.t(petMoodKey(mood));
  }

  periodOfLifeLabel(periodOfLife: PetPeriodOfLife): string {
    return this.i18n.t(petPeriodOfLifeKey(periodOfLife));
  }

  formatDate(value: string): string {
    return new Intl.DateTimeFormat(this.i18n.language(), {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(value));
  }

}
