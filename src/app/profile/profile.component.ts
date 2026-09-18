import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

import { I18nService } from '../i18n/i18n.service';
import { PetStatsComponent } from '../pets/pet-stats.component';
import { PetDatePipe } from '../pets/pet-date.pipe';
import {
  OwnedPet,
  PetFarewellPhraseId,
  PetFarewellReason,
  PetMood,
  PetPeriodOfLife,
  PetStatus
} from '../pets/owned-pet.model';
import {
  petFarewellPhraseKey,
  petFarewellReasonKey,
  petMoodKey,
  petOption,
  petPeriodOfLifeKey,
  petStatusKey,
  sessionLength
} from '../pets/pet-display.utils';
import { PetStorageService } from '../pets/pet-storage.service';

@Component({
  selector: 'app-profile',
  imports: [
    RouterLink,
    PetStatsComponent,
    PetDatePipe
  ],
  templateUrl: './profile.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent {

  constructor(
    public readonly i18n: I18nService,
    public readonly pets: PetStorageService
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

  lightLabel(pet: OwnedPet): string {
    return pet.isLightOn ? this.i18n.t('petLightOn') : this.i18n.t('petLightOff');
  }

  farewellReasonLabel(reason: PetFarewellReason): string {
    return this.i18n.t(petFarewellReasonKey(reason));
  }

  farewellPhraseLabel(phraseId: PetFarewellPhraseId): string {
    return this.i18n.t(petFarewellPhraseKey(phraseId));
  }


}
