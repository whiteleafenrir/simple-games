import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { I18nService } from '../i18n/i18n.service';
import { PetAppearance, PetCoatColor, PetCoatPattern } from './owned-pet.model';
import { COAT_COLORS, COAT_PATTERNS, DEFAULT_APPEARANCE } from './pet-appearance';

@Component({
  selector: 'app-pet-appearance-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <fieldset [disabled]="disabled()">
      <legend>{{ i18n.t('coatColor') }}</legend>
      <div class="options">
        @for (color of colors; track color.id) {
          <button type="button" [attr.aria-pressed]="value().color === color.id" (click)="setColor(color.id)">
            <i [style.background]="color.swatch" aria-hidden="true"></i>{{ i18n.t(color.label) }}
          </button>
        }
      </div>
    </fieldset>
    <fieldset [disabled]="disabled()">
      <legend>{{ i18n.t('coatPattern') }}</legend>
      <div class="options">
        @for (pattern of patterns; track pattern.id) {
          <button type="button" [attr.aria-pressed]="value().pattern === pattern.id" (click)="setPattern(pattern.id)">
            <i class="pattern-swatch" [class.spots]="pattern.id === 'spots'" [class.stripes]="pattern.id === 'stripes'" aria-hidden="true"></i>{{ i18n.t(pattern.label) }}
          </button>
        }
      </div>
    </fieldset>
  `,
  styles: `
    :host { display: block; min-width: 0; }
    fieldset { margin: 0; padding: 0; border: 0; min-width: 0; }
    fieldset + fieldset { margin-top: 18px; }
    legend { margin-bottom: 10px; color: var(--muted-text); font-size: .8rem; }
    .options { display: flex; flex-wrap: wrap; gap: 8px; }
    button { display: inline-flex; align-items: center; gap: 7px; min-height: 44px; padding: 8px 12px; border: 1px solid var(--border); border-radius: 12px; background: var(--surface); color: var(--text); font-size: .8rem; }
    button[aria-pressed="true"] { border-color: var(--primary); background: var(--primary-soft-fill); box-shadow: inset 0 0 0 1px var(--primary); }
    i { width: 18px; height: 18px; border-radius: 50%; border: 1px solid #0002; }
    .pattern-swatch { background-color: var(--secondary); color: var(--muted-text); }
    .pattern-swatch.spots { background-image: radial-gradient(currentColor 1.5px, transparent 2px); background-size: 7px 7px; }
    .pattern-swatch.stripes { background-image: repeating-linear-gradient(120deg, transparent 0 4px, currentColor 4px 6px); }
    fieldset:disabled { opacity: .6; }
  `
})
export class PetAppearancePickerComponent {
  readonly i18n = inject(I18nService);
  readonly value = input<PetAppearance>(DEFAULT_APPEARANCE);
  readonly disabled = input(false);
  readonly valueChange = output<PetAppearance>();
  readonly colors = COAT_COLORS;
  readonly patterns = COAT_PATTERNS;
  setColor(color: PetCoatColor): void { this.valueChange.emit({ ...this.value(), color }); }
  setPattern(pattern: PetCoatPattern): void { this.valueChange.emit({ ...this.value(), pattern }); }
}
