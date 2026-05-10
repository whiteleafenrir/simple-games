import { Component, computed } from '@angular/core';
import { RouterLink } from '@angular/router';

import { I18nService } from '../i18n/i18n.service';
import { PetStorageService } from '../pets/pet-storage.service';

@Component({
  selector: 'app-home',
  imports: [
    RouterLink
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {
  readonly activePetId = computed((): string | null => this.pets.activePet()?.id ?? null);

  constructor(
    public readonly i18n: I18nService,
    private readonly pets: PetStorageService
  ) {}
}
