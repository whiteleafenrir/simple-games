import { Component, computed } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { I18nService } from '../i18n/i18n.service';
import {
  OwnedPet,
  PetCareActionEntry,
  PetCareActionId,
  PetFarewellPhraseId,
  PetFarewellReason,
  PetFarewellResult,
  PetMood,
  PetPeriodOfLife,
  PetStatId,
  PetStatus
} from '../pets/owned-pet.model';
import {
  PET_STAT_IDS,
  petCareActionKey,
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
  readonly statIds: readonly PetStatId[] = PET_STAT_IDS;

  constructor(
    public readonly i18n: I18nService,
    private readonly route: ActivatedRoute,
    private readonly pets: PetStorageService
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

  lightLabel(pet: OwnedPet): string {
    return pet.isLightOn ? this.i18n.t('petLightOn') : this.i18n.t('petLightOff');
  }

  finalStatValue(farewell: PetFarewellResult, statId: PetStatId): number {
    return Math.round(farewell.finalStats[statId]);
  }

  farewellReasonLabel(reason: PetFarewellReason): string {
    return this.i18n.t(petFarewellReasonKey(reason));
  }

  farewellPhraseLabel(phraseId: PetFarewellPhraseId): string {
    return this.i18n.t(petFarewellPhraseKey(phraseId));
  }

  careActionLabel(actionId: PetCareActionId): string {
    return this.i18n.t(petCareActionKey(actionId));
  }

  careHistory(pet: OwnedPet): readonly PetCareActionEntry[] {
    return [...pet.careHistory].reverse();
  }

  statDelta(entry: PetCareActionEntry, statId: PetStatId): string {
    return this.formatSigned(entry.statsAfter[statId] - entry.statsBefore[statId]);
  }

  scoreDelta(entry: PetCareActionEntry): string {
    return this.formatSigned(entry.careScoreAfter - entry.careScoreBefore);
  }

  lightChangeLabel(entry: PetCareActionEntry): string | null {
    if (entry.isLightOnBefore === entry.isLightOnAfter) {
      return null;
    }

    const before = entry.isLightOnBefore ? this.i18n.t('petLightOn') : this.i18n.t('petLightOff');
    const after = entry.isLightOnAfter ? this.i18n.t('petLightOn') : this.i18n.t('petLightOff');
    return `${this.i18n.t('petLight')}: ${before} -> ${after}`;
  }

  awayChangeLabel(entry: PetCareActionEntry): string | null {
    if (!entry.awayUntilAfter || entry.awayUntilBefore === entry.awayUntilAfter) {
      return null;
    }

    return `${this.i18n.t('petAwayUntil')}: ${this.formatDate(entry.awayUntilAfter)}`;
  }

  formatDate(value: string): string {
    return new Intl.DateTimeFormat(this.i18n.language(), {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(value));
  }

  private formatSigned(value: number): string {
    const rounded = Math.round(value * 10) / 10;
    return `${rounded > 0 ? '+' : ''}${rounded}`;
  }

}
