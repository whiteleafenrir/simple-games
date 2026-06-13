import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { I18nService } from '../i18n/i18n.service';
import {
  OwnedPet,
  PetFarewellPhraseId,
  PetFarewellReason,
  PetMood,
  PetPeriodOfLife,
  PetStatId,
  PetStatus
} from '../pets/owned-pet.model';
import {
  PET_STAT_IDS,
  petFarewellPhraseKey,
  petFarewellReasonKey,
  petMoodKey,
  petOption,
  petPeriodOfLifeKey,
  petStatKey,
  petStatusKey,
  sessionLength
} from '../pets/pet-display.utils';
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
  readonly statIds: readonly PetStatId[] = PET_STAT_IDS;

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

  statLabel(statId: PetStatId): string {
    return this.i18n.t(petStatKey(statId));
  }

  statValue(pet: OwnedPet, statId: PetStatId): number {
    return Math.round(pet.stats[statId]);
  }

  farewellReasonLabel(reason: PetFarewellReason): string {
    return this.i18n.t(petFarewellReasonKey(reason));
  }

  farewellPhraseLabel(phraseId: PetFarewellPhraseId): string {
    return this.i18n.t(petFarewellPhraseKey(phraseId));
  }

  formatDate(value: string): string {
    return new Intl.DateTimeFormat(this.i18n.language(), {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(value));
  }

}
