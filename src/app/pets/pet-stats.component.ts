import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';

import { I18nService } from '../i18n/i18n.service';
import { PetStats } from './owned-pet.model';
import { PET_STAT_IDS, petStatKey } from './pet-display.utils';

@Component({
  selector: 'app-pet-stats',
  templateUrl: './pet-stats.component.html',
  styleUrl: './pet-stats.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PetStatsComponent {
  readonly i18n = inject(I18nService);
  readonly stats = input.required<PetStats>();
  readonly compact = input(false);
  readonly values = computed(() => PET_STAT_IDS.map(id => ({
    id,
    label: petStatKey(id),
    value: Math.round(this.stats()[id])
  })));
}
