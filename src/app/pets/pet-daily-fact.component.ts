import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import type { PetDailyFact } from '@simple-games/pet-contract';
import { I18nService } from '../i18n/i18n.service';

@Component({
  selector: 'app-pet-daily-fact',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="daily-fact" [attr.aria-label]="i18n.t('petDailyFactTitle')">
      <header>
        <h2>{{ i18n.t('petDailyFactTitle') }}</h2>
        <time [attr.datetime]="fact().day">{{ dateLabel() }}</time>
      </header>
      <p>{{ i18n.t(fact().id) }}</p>
      <a [href]="fact().sourceUrl" target="_blank" rel="noopener noreferrer">
        {{ i18n.t('petDailyFactSource') }}: {{ fact().sourceName }}
        <span aria-hidden="true">↗</span>
        <span class="visually-hidden"> ({{ i18n.t('petDailyFactNewTab') }})</span>
      </a>
    </section>
  `,
  styleUrl: './pet-daily-fact.component.css'
})
export class PetDailyFactComponent {
  readonly i18n = inject(I18nService);
  readonly fact = input.required<PetDailyFact>();
  readonly dateLabel = computed(() =>
    new Intl.DateTimeFormat(this.i18n.language(), {
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC'
    }).format(new Date(`${this.fact().day}T00:00:00Z`))
  );
}
