import { Component, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../i18n/i18n.service';
import { PetIllustrationComponent } from '../pets/pet-illustration.component';
import { PetDatePipe } from '../pets/pet-date.pipe';
import { petFarewellPhraseKey, petOption, petPeriodOfLifeKey } from '../pets/pet-display.utils';
import { PetStorageService } from '../pets/pet-storage.service';

@Component({
  selector: 'app-profile',
  imports: [RouterLink, PetIllustrationComponent, PetDatePipe],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileComponent {
  readonly i18n = inject(I18nService);
  readonly pets = inject(PetStorageService);
  readonly albumPets = computed(() => [...this.pets.pets()].sort((a, b) =>
    Number(b.status === 'pet') - Number(a.status === 'pet') || Date.parse(b.createdAt) - Date.parse(a.createdAt)));
  readonly petOption = petOption;
  readonly petPeriodOfLifeKey = petPeriodOfLifeKey;
  readonly petFarewellPhraseKey = petFarewellPhraseKey;
}
