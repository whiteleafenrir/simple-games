import { Component, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../i18n/i18n.service';
import { PetStorageService } from '../pets/pet-storage.service';
import { PetIllustrationComponent } from '../pets/pet-illustration.component';
import { PetActionIconComponent } from '../pets/pet-action-icon.component';
import { petMoodKey, petOption, petPeriodOfLifeKey } from '../pets/pet-display.utils';
import { PET_OPTIONS } from '../pocket-pet/pocket-pet.config';

@Component({
  selector: 'app-home',
  imports: [RouterLink, PetIllustrationComponent, PetActionIconComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent {
  readonly i18n = inject(I18nService);
  readonly pets = inject(PetStorageService);
  readonly companions = PET_OPTIONS.filter(pet => !pet.disabled);
  readonly memories = computed(() => this.pets.pets().filter(pet => pet.status !== 'pet').length);
  readonly petOption = petOption;
  readonly petMoodKey = petMoodKey;
  readonly petPeriodOfLifeKey = petPeriodOfLifeKey;
}
