import { DOCUMENT, NgTemplateOutlet } from '@angular/common';
import { afterRenderEffect, ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, input, output, signal, viewChild } from '@angular/core';
import { I18nService } from '../i18n/i18n.service';
import { TranslationKey } from '../i18n/translations';
import { PetSceneActionId, PetSnapshot } from './owned-pet.model';
import { petCareActionHintKey, petCareActionKey, petMoodKey } from './pet-display.utils';
import { PetActionIconComponent } from './pet-action-icon.component';
import { PetIllustrationComponent } from './pet-illustration.component';
import { PetDatePipe } from './pet-date.pipe';
import { PET_REACTIONS, PetReactionService } from './pet-reaction';

export interface PetSceneActionEvent { id: PetSceneActionId; trigger: HTMLElement; }

@Component({
  selector: 'app-pet-scene',
  imports: [NgTemplateOutlet, PetActionIconComponent, PetIllustrationComponent, PetDatePipe],
  templateUrl: './pet-scene.component.html',
  styleUrl: './pet-scene.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'tooltip.set(null)' }
})
export class PetSceneComponent {
  readonly pet = input.required<PetSnapshot>();
  private readonly reactions = inject(PetReactionService);
  readonly reaction = computed(() => {
    const pet = this.pet();
    const reaction = this.reactions.current();
    return pet.status === 'pet' && pet.isLightOn && !pet.awayUntil && reaction?.petId === pet.id ? reaction : null;
  });
  readonly reactionLabel = computed(() => {
    const reaction = this.reaction();
    return reaction ? PET_REACTIONS[reaction.kind].label : null;
  });
  readonly blocked = input<TranslationKey | null>(null);
  readonly refreshing = input(false);
  readonly actionRequested = output<PetSceneActionEvent>();
  readonly refreshRequested = output<void>();
  readonly i18n = inject(I18nService);
  private readonly document = inject(DOCUMENT);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('actionDialog');
  private trigger: HTMLElement | null = null;
  private currentPetId = '';
  private feedbackAction: PetSceneActionId | null = null;
  readonly tooltip = signal<PetSceneActionId | null>(null);
  readonly selectedAction = signal<PetSceneActionId | null>(null);
  readonly actions: readonly PetSceneActionId[] = ['feed', 'junkFood', 'clean', 'play', 'walk', 'questions', 'toggleLight'];

  constructor() {
    effect(() => {
      const pet = this.pet();
      const current = this.reactions.current();
      if (current && (current.petId !== pet.id || pet.status !== 'pet' || !pet.isLightOn || pet.awayUntil)) this.reactions.clear();
    });
    afterRenderEffect(() => {
      if (this.reaction()) this.tooltip.set(null);
      if (this.currentPetId !== this.pet().id) { this.currentPetId = this.pet().id; this.closeDetails(); }
      if (this.selectedAction() && !this.dialog().nativeElement.open) this.dialog().nativeElement.showModal();
    });
  }

  label(id: PetSceneActionId): string {
    if (id === 'questions') return this.i18n.t('questionTitle');
    if (id === 'toggleLight') return this.i18n.t(this.pet().isLightOn ? 'turnLightOff' : 'turnLightOn');
    return this.i18n.t(petCareActionKey(id));
  }

  hint(id: PetSceneActionId): string {
    return this.i18n.t(id === 'questions' ? 'questionHint' : petCareActionHintKey(id));
  }

  availability(id: PetSceneActionId) { return this.pet().actions[id]; }

  disabled(id: PetSceneActionId): boolean { return !!this.blocked() || !this.pet().actions[id].available; }

  state(id: PetSceneActionId): string {
    const blocked = this.blocked();
    if (blocked) return this.i18n.t(blocked);
    const reason = this.pet().actions[id].reason;
    const keys: Record<NonNullable<typeof reason>, TranslationKey> = {
      inactive: 'careActionInactive', away: 'careActionAway', sleeping: 'careActionSleeping',
      cooldown: 'careActionCoolingDown', 'player-energy': 'careActionNoPlayerEnergy', 'no-content': 'questionNoContent'
    };
    return this.i18n.t(reason ? keys[reason] : 'careActionReady');
  }

  sceneState(): string {
    const pet = this.pet();
    return this.i18n.t(pet.status !== 'pet' ? 'sceneMemory' : pet.awayUntil ? 'sceneAway' : !pet.isLightOn ? 'sceneSleeping' : petMoodKey(pet.mood));
  }

  hover(id: PetSceneActionId, event: PointerEvent): void {
    if (event.pointerType === 'mouse') { this.feedbackAction = null; this.tooltip.set(id); }
  }

  focusTooltip(id: PetSceneActionId): void {
    // Returning focus after a command must not cover the pet's brief reaction.
    if (this.feedbackAction === id && this.reaction()) return;
    this.tooltip.set(id);
  }

  choose(id: PetSceneActionId, event: MouseEvent, trigger: HTMLElement): void {
    event.stopPropagation();
    if (id !== 'play' && this.usesActionSheet(event)) { this.showDetails(id, trigger); return; }
    if (!this.disabled(id)) { this.feedbackAction = id; this.tooltip.set(null); this.actionRequested.emit({ id, trigger }); }
  }

  inspectDisabled(id: PetSceneActionId, event: Event, trigger: HTMLElement): void {
    if (this.disabled(id) && this.usesActionSheet(event)) { event.preventDefault(); this.showDetails(id, trigger); }
  }

  execute(): void {
    const id = this.selectedAction();
    const trigger = this.trigger;
    if (!id || !trigger || this.disabled(id)) return;
    this.closeDetails();
    this.feedbackAction = id;
    this.actionRequested.emit({ id, trigger });
  }

  cancel(event: Event): void { event.preventDefault(); this.closeDetails(); }

  closeDetails(): void {
    this.selectedAction.set(null);
    const dialog = this.dialog().nativeElement;
    if (dialog?.open) { dialog.close(); if (this.trigger?.isConnected) this.trigger.focus(); }
  }

  private showDetails(id: PetSceneActionId, trigger: HTMLElement): void {
    this.trigger = trigger;
    this.tooltip.set(null);
    this.selectedAction.set(id);
  }

  private usesActionSheet(event: Event): boolean {
    return ('pointerType' in event && event.pointerType === 'touch') ||
      !!this.document.defaultView?.matchMedia('(hover: none), (max-width: 600px)').matches;
  }
}
