import { afterRenderEffect, ChangeDetectionStrategy, Component, computed, DestroyRef, effect, ElementRef, inject, input, signal, viewChild } from '@angular/core';
import { I18nService } from '../i18n/i18n.service';
import { TranslationKey } from '../i18n/translations';
import { PetSnapshot, PetCareActionFailureReason } from '../pets/owned-pet.model';
import { PetStorageService } from '../pets/pet-storage.service';
import { PetTicTacToeComponent } from './pet-tic-tac-toe.component';
import { WordCloudsComponent } from './word-clouds.component';

type PetGame = 'word-clouds' | 'tic-tac-toe';
const FAILURE_KEYS: Record<PetCareActionFailureReason, TranslationKey> = {
  inactive: 'careActionInactive', sleeping: 'careActionSleeping', away: 'careActionAway',
  cooldown: 'careActionCoolingDown', 'player-energy': 'careActionNoPlayerEnergy'
};

@Component({
  selector: 'app-pet-games',
  imports: [WordCloudsComponent, PetTicTacToeComponent],
  templateUrl: './pet-games.component.html',
  styleUrl: './pet-games.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PetGamesComponent {
  readonly pet = input.required<PetSnapshot>();
  readonly i18n = inject(I18nService);
  readonly storage = inject(PetStorageService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('gamesDialog');
  private readonly heading = viewChild.required<ElementRef<HTMLHeadingElement>>('heading');
  private trigger: HTMLElement | null = null;
  private sessionPetId = '';
  private version = 0;
  private readonly focusHeading = signal(false);
  readonly opened = signal(false);
  readonly selected = signal<PetGame | null>(null);
  readonly started = signal(false);
  readonly busy = signal(false);
  readonly message = signal<TranslationKey | null>(null);
  readonly unavailable = computed<TranslationKey | null>(() => {
    const pet = this.pet();
    return pet.status !== 'pet' ? 'careActionInactive' : pet.awayUntil ? 'careActionAway' : !pet.isLightOn ? 'careActionSleeping' : null;
  });
  readonly startBlocked = computed<TranslationKey | null>(() => {
    if (this.unavailable()) return this.unavailable();
    if (this.busy() || this.storage.commandPending()) return 'petActionPending';
    if (this.storage.loading()) return 'petLoading';
    if (this.storage.syncError()) return this.storage.syncError();
    if (this.started()) return null;
    const availability = this.pet().actions.play;
    return availability.available ? null : availability.reason && availability.reason !== 'no-content' ? FAILURE_KEYS[availability.reason] : 'careActionInactive';
  });

  constructor() {
    effect(() => {
      if (this.opened() && this.pet().id !== this.sessionPetId) this.close();
    });
    afterRenderEffect(() => {
      if (this.opened() && this.focusHeading()) {
        this.heading().nativeElement.focus();
        this.focusHeading.set(false);
      }
    });
  }

  open(trigger: HTMLElement): void {
    if (this.opened() || this.startBlocked()) return;
    this.trigger = trigger;
    this.sessionPetId = this.pet().id;
    this.version++;
    this.message.set(null);
    this.selected.set(null);
    this.started.set(false);
    this.opened.set(true);
    this.dialog().nativeElement.showModal();
    this.focusHeading.set(true);
  }

  async choose(game: PetGame): Promise<void> {
    if (!this.opened() || this.startBlocked()) return;
    this.message.set(null);
    if (!this.started()) {
      const version = this.version;
      const petId = this.pet().id;
      this.busy.set(true);
      const response = await this.storage.careForPet(petId, 'play');
      if (this.destroyRef.destroyed || version !== this.version || petId !== this.pet().id) return;
      this.busy.set(false);
      if (!response) { this.message.set(this.storage.commandError() ?? 'petGamesStartError'); return; }
      if (!response.applied) { this.message.set(response.reason ? FAILURE_KEYS[response.reason] : 'petGamesStartError'); return; }
      this.started.set(true);
    }
    if (this.unavailable()) return;
    this.selected.set(game);
    this.focusHeading.set(true);
  }

  back(): void {
    this.selected.set(null);
    this.message.set(null);
    this.focusHeading.set(true);
  }

  cancel(event: Event): void { event.preventDefault(); this.close(); }

  close(): void {
    this.version++;
    this.opened.set(false);
    this.selected.set(null);
    this.started.set(false);
    this.busy.set(false);
    this.message.set(null);
    const dialog = this.dialog().nativeElement;
    if (dialog.open) dialog.close();
    if (this.trigger?.isConnected) {
      const button = this.trigger.querySelector<HTMLButtonElement>('button:not(:disabled)');
      (button ?? this.trigger).focus();
    }
  }
}
