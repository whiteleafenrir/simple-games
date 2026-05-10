import { Component, computed } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { I18nService } from '../i18n/i18n.service';
import { OwnedPet, PetMood, PetPeriodOfLife, PetStatus } from '../pets/owned-pet.model';
import { petMoodKey, petOption, petPeriodOfLifeKey, petStatusKey, sessionLength } from '../pets/pet-display.utils';
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
