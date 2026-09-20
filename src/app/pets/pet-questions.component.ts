import { afterRenderEffect, ChangeDetectionStrategy, Component, DestroyRef, effect, ElementRef, inject, input, signal, viewChild } from '@angular/core';
import type { PetSnapshot, PetQuestionAttempt, PetQuestionResult, QuestionFailureReason, QuestionOutcome } from '@simple-games/pet-contract';
import { I18nService } from '../i18n/i18n.service';
import { TranslationKey } from '../i18n/translations';
import { PetDatePipe } from './pet-date.pipe';
import { petErrorKey } from './pet-error.utils';
import { PetStorageService } from './pet-storage.service';

@Component({
  selector: 'app-pet-questions',
  imports: [PetDatePipe],
  templateUrl: './pet-questions.component.html',
  styleUrl: './pet-questions.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PetQuestionsComponent {
  readonly pet = input.required<PetSnapshot>();
  readonly historyOnly = input(false);
  readonly showTrigger = input(true);
  private externalTrigger: HTMLElement | null = null;
  readonly i18n = inject(I18nService);
  readonly storage = inject(PetStorageService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('questionDialog');
  private readonly openButton = viewChild<ElementRef<HTMLButtonElement>>('openButton');
  readonly attempt = signal<PetQuestionAttempt | null>(null);
  readonly result = signal<PetQuestionResult | null>(null);
  readonly message = signal<TranslationKey | null>(null);
  readonly nextAvailableAt = signal<string | null>(null);
  readonly busy = signal(false);
  readonly retryAnswer = signal<{ attemptId: string; optionId: string | null } | null>(null);
  readonly historyVisible = signal(false);
  readonly history = signal<PetQuestionResult[]>([]);
  readonly historyCursor = signal<string | null>(null);
  readonly historyBusy = signal(false);
  readonly historyError = signal<TranslationKey | null>(null);
  private petId = '';

  constructor() {
    effect(() => {
      const pet = this.pet();
      if (this.petId !== pet.id) {
        this.petId = pet.id;
        this.attempt.set(null); this.result.set(null); this.message.set(null); this.nextAvailableAt.set(null);
        this.retryAnswer.set(null); this.history.set([]); this.historyVisible.set(false); this.historyCursor.set(null);
        this.busy.set(false); this.historyBusy.set(false); this.historyError.set(null);
      }
      if (pet.status !== 'pet') { this.attempt.set(null); this.retryAnswer.set(null); }
    });
    afterRenderEffect(() => {
      const dialog = this.dialog().nativeElement;
      if (this.attempt() && !dialog.open) dialog.showModal();
      else if (!this.attempt() && dialog.open) {
        dialog.close();
        if (this.externalTrigger?.isConnected) this.externalTrigger.focus();
        else this.openButton()?.nativeElement.focus();
      }
    });
  }

  async open(trigger?: HTMLElement): Promise<void> {
    if (this.disabled()) return;
    this.externalTrigger = trigger ?? null;
    const petId = this.pet().id;
    this.busy.set(true); this.message.set(null);
    const response = await this.storage.startQuestion(petId, this.i18n.language());
    if (!this.isCurrent(petId)) return;
    this.busy.set(false);
    if (!response) { this.message.set('questionOpenError'); return; }
    this.nextAvailableAt.set(response.nextAvailableAt);
    if (response.reason) { this.message.set(this.reasonKey(response.reason)); return; }
    if (response.attempt && this.pet().status === 'pet') {
      this.retryAnswer.set(null); this.attempt.set(response.attempt);
    }
  }

  async answer(optionId: string | null): Promise<void> {
    const attempt = this.attempt();
    if (!attempt || this.busy() || this.storage.commandPending() || this.retryAnswer()) return;
    await this.sendAnswer(attempt.id, optionId);
  }

  async retry(): Promise<void> {
    const retry = this.retryAnswer();
    if (retry && !this.busy() && !this.storage.commandPending()) await this.sendAnswer(retry.attemptId, retry.optionId);
  }

  cancel(event: Event): void {
    event.preventDefault();
    void this.answer(null);
  }

  private async sendAnswer(attemptId: string, optionId: string | null): Promise<void> {
    const petId = this.pet().id;
    this.busy.set(true);
    const response = await this.storage.answerQuestion(petId, attemptId, optionId);
    if (!this.isCurrent(petId)) return;
    this.busy.set(false);
    if (!response) {
      if (this.attempt()) this.retryAnswer.set({ attemptId, optionId });
      return;
    }
    this.retryAnswer.set(null);
    this.nextAvailableAt.set(response.nextAvailableAt);
    if (response.reason) {
      this.message.set(this.reasonKey(response.reason));
      this.attempt.set(null);
      return;
    }
    if (response.result) {
      this.result.set(response.result); this.message.set(null); this.attempt.set(null);
      if (this.historyVisible()) void this.loadHistory(false);
    }
  }

  async toggleHistory(): Promise<void> {
    this.historyVisible.update(visible => !visible);
    if (this.historyVisible()) await this.loadHistory(false);
  }

  async loadHistory(more = false): Promise<void> {
    if (this.historyBusy()) return;
    const petId = this.pet().id;
    this.historyBusy.set(true); this.historyError.set(null);
    try {
      const page = await this.storage.getQuestionHistory(petId, more ? this.historyCursor() : null);
      if (!this.isCurrent(petId)) return;
      this.history.update(items => more ? [...items, ...page.items.filter(item => !items.some(existing => existing.attempt.id === item.attempt.id))] : page.items);
      this.historyCursor.set(page.nextCursor);
    } catch (error) {
      if (this.isCurrent(petId)) this.historyError.set(petErrorKey(error));
    } finally {
      if (this.isCurrent(petId)) this.historyBusy.set(false);
    }
  }

  disabled(): boolean {
    return this.historyOnly() || this.busy() || this.storage.commandPending() || this.storage.loading() || !!this.storage.syncError() || !this.pet().actions.questions.available;
  }

  outcomeKey(outcome: QuestionOutcome): TranslationKey {
    const keys: Record<QuestionOutcome, TranslationKey> = {
      correct: 'questionCorrect', incorrect: 'questionIncorrect', declined: 'questionDeclined'
    };
    return keys[outcome];
  }

  correctAnswer(result: PetQuestionResult): string {
    return result.attempt.content[this.i18n.language()].options.find(option => option.id === result.correctOptionId)?.text ?? '';
  }

  delta(value: number): string {
    const rounded = Math.round(value * 10) / 10;
    return `${rounded > 0 ? '+' : ''}${rounded}`;
  }

  trust(): number { return Math.round(this.pet().trust); }

  private reasonKey(reason: QuestionFailureReason): TranslationKey {
    const keys: Record<QuestionFailureReason, TranslationKey> = {
      inactive: 'careActionInactive', sleeping: 'careActionSleeping', away: 'careActionAway',
      cooldown: 'questionCooldown', 'no-content': 'questionNoContent'
    };
    return keys[reason];
  }

  private isCurrent(petId: string): boolean { return !this.destroyRef.destroyed && this.pet().id === petId; }
}
