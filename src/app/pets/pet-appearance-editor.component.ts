import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { I18nService } from '../i18n/i18n.service';
import { PetAppearance, PetSnapshot } from './owned-pet.model';
import { PetStorageService } from './pet-storage.service';
import { PetIllustrationComponent } from './pet-illustration.component';
import { PetAppearancePickerComponent } from './pet-appearance-picker.component';

@Component({
  selector: 'app-pet-appearance-editor',
  imports: [PetIllustrationComponent, PetAppearancePickerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="appearance-editor">
      <button type="button" class="toggle" [attr.aria-expanded]="!!draft()" (click)="toggle()">{{ i18n.t('petAppearance') }}</button>
      @if (draft(); as appearance) {
        <div class="editor-content">
          <div class="preview">
            <app-pet-illustration [species]="pet().petId" [mood]="pet().mood" [sleeping]="!pet().isLightOn"
              [appearance]="appearance" [cleanliness]="pet().stats.cleanliness" [animated]="true" [calmJoy]="true" />
            <small>{{ i18n.t('appearancePreview') }}</small>
          </div>
          <div class="controls">
            <app-pet-appearance-picker [value]="appearance" [disabled]="blocked()" (valueChange)="draft.set($event)" />
            <div class="buttons">
              <button type="button" [disabled]="blocked()" (click)="save()">{{ i18n.t(storage.commandPending() ? 'petActionPending' : 'appearanceSave') }}</button>
              <button type="button" [disabled]="storage.commandPending()" (click)="draft.set(null)">{{ i18n.t('appearanceCancel') }}</button>
            </div>
            <p>{{ i18n.t('appearanceHint') }}</p>
          </div>
        </div>
      }
      @if (saved()) { <p role="status">{{ i18n.t('appearanceSaved') }}</p> }
    </section>
  `,
  styles: `
    :host { display: block; margin-top: 18px; }
    .appearance-editor { border: 1px solid var(--border); border-radius: 20px; background: var(--surface); padding: 18px; }
    button { min-height: 44px; border: 1px solid var(--border); border-radius: 12px; padding: 10px 16px; color: var(--text); background: var(--secondary); }
    button:disabled { opacity: .6; }
    .toggle { color: var(--primary); background: transparent; font-weight: 650; }
    .editor-content { display: grid; grid-template-columns: minmax(130px, 220px) minmax(0, 1fr); align-items: center; gap: 28px; padding: 20px 0 0; }
    .preview { display: grid; justify-items: center; background: var(--garden-bg); border-radius: 18px; padding: 12px; }
    .preview app-pet-illustration { width: 180px; max-width: 100%; }
    small, p { color: var(--muted-text); font-size: .8rem; line-height: 1.6; }
    .buttons { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 22px; }
    .buttons button:first-child { background: var(--primary); color: var(--primary-contrast); }
    @media (max-width: 600px) { .editor-content { grid-template-columns: minmax(0, 1fr); gap: 18px; } }
  `
})
export class PetAppearanceEditorComponent {
  readonly pet = input.required<PetSnapshot>();
  readonly i18n = inject(I18nService);
  readonly storage = inject(PetStorageService);
  readonly draft = signal<PetAppearance | null>(null);
  readonly saved = signal(false);
  readonly blocked = computed(() => this.storage.commandPending() || this.storage.loading() || !!this.storage.syncError() || this.pet().status !== 'pet');
  private currentId = '';
  constructor() {
    effect(() => {
      if (this.currentId !== this.pet().id) {
        this.currentId = this.pet().id;
        this.draft.set(null); this.saved.set(false);
      }
    });
  }
  toggle(): void {
    if (this.storage.commandPending()) return;
    this.saved.set(false);
    this.draft.update(value => value ? null : { ...this.pet().appearance });
  }
  async save(): Promise<void> {
    const draft = this.draft();
    if (!draft || this.blocked()) return;
    const id = this.pet().id;
    const result = await this.storage.updateAppearance(id, draft);
    if (result && this.pet().id === id) { this.draft.set(null); this.saved.set(true); }
  }
}
