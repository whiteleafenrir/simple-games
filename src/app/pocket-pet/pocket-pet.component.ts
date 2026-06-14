import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';

import { I18nService } from '../i18n/i18n.service';
import {
  PET_CARE_ACTION_IDS,
  careActionCooldownRemainingMs,
  careActionFailureReason,
  petAwayRemainingMs
} from '../pets/pet-engine';
import {
  OwnedPet,
  PetCareActionId,
  PetFarewellPhraseId,
  PetFarewellReason,
  PetMood,
  PetPeriodOfLife,
  PetStatId,
  PetStatus
} from '../pets/owned-pet.model';
import {
  PET_STAT_IDS,
  petCareActionHintKey,
  petCareActionKey,
  petFarewellPhraseKey,
  petFarewellReasonKey,
  petMoodKey,
  petOption,
  petPeriodOfLifeKey,
  petStatKey,
  petStatusKey
} from '../pets/pet-display.utils';
import { PetStorageService } from '../pets/pet-storage.service';
import { PET_OPTIONS, SESSION_LENGTHS } from './pocket-pet.config';
import { PetOption, SessionLength } from './pocket-pet.model';

@Component({
  selector: 'app-pocket-pet',
  imports: [
    RouterLink
  ],
  templateUrl: './pocket-pet.component.html',
  styleUrls: ['./pocket-pet.component.css']
})
export class PocketPetComponent implements OnDestroy {
  public readonly i18n = inject(I18nService);
  public readonly petStorage = inject(PetStorageService);
  private readonly route = inject(ActivatedRoute);
  private readonly viewedPetId = toSignal(
    this.route.paramMap.pipe(map((paramMap) => paramMap.get('petId'))),
    { initialValue: this.route.snapshot.paramMap.get('petId') }
  );

  readonly viewedPet = computed((): OwnedPet | null => {
    const id = this.viewedPetId();
    return id ? this.petStorage.petById(id) : this.petStorage.activePet();
  });

  readonly now = signal<Date>(new Date());
  readonly statIds: readonly PetStatId[] = PET_STAT_IDS;
  readonly careActions: readonly PetCareActionId[] = PET_CARE_ACTION_IDS;
  readonly sessionLengths: readonly SessionLength[] = SESSION_LENGTHS;
  readonly petOptions: readonly PetOption[] = PET_OPTIONS;
  readonly selectedSession = signal<SessionLength>(SESSION_LENGTHS[1]);
  readonly selectedPet = signal<PetOption>(PET_OPTIONS[0]);
  readonly petName = signal<string>('');
  readonly createdPetMessage = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly careMessage = signal<string | null>(null);
  readonly canCreatePet = computed((): boolean => this.petName().trim().length > 0 && !this.petStorage.activePet());
  private readonly timerId: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.petStorage.resolvePets(this.now());

    if (typeof setInterval !== 'undefined') {
      this.timerId = setInterval((): void => {
        const now = new Date();
        this.now.set(now);
        this.petStorage.resolvePets(now);
      }, 30_000);
    }
  }

  ngOnDestroy(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
    }
  }

  selectSession(sessionLength: SessionLength): void {
    this.selectedSession.set(sessionLength);
    this.createdPetMessage.set(null);
    this.errorMessage.set(null);
  }

  selectPet(pet: PetOption): void {
    if (pet.disabled) {
      return;
    }

    this.selectedPet.set(pet);
    this.createdPetMessage.set(null);
    this.errorMessage.set(null);
  }

  updatePetName(name: string): void {
    this.petName.set(name);
    this.createdPetMessage.set(null);
    this.errorMessage.set(null);
  }

  createPet(): void {
    const name = this.petName().trim();

    if (!name) {
      this.errorMessage.set(this.i18n.t('petNameRequired'));
      return;
    }

    const ownedPet = this.petStorage.addPet(this.selectedPet(), this.selectedSession(), name);

    if (!ownedPet) {
      this.errorMessage.set(this.i18n.t('activePetExists'));
      return;
    }

    this.petName.set('');
    this.createdPetMessage.set(this.i18n.t('petCreated'));
    this.errorMessage.set(null);
  }

  careForPet(pet: OwnedPet, actionId: PetCareActionId): void {
    const now = new Date();
    const result = this.petStorage.careForPet(pet.id, actionId, now);
    this.now.set(now);

    if (!result) {
      return;
    }

    if (result.applied) {
      this.careMessage.set(this.i18n.t('careActionApplied'));
      return;
    }

    if (result.reason === 'cooldown') {
      this.careMessage.set(this.i18n.t('careActionCoolingDown'));
      return;
    }

    if (result.reason === 'away') {
      this.careMessage.set(this.i18n.t('careActionAway'));
      return;
    }

    if (result.reason === 'sleeping') {
      this.careMessage.set(this.i18n.t('careActionSleeping'));
      return;
    }

    this.careMessage.set(this.i18n.t('careActionInactive'));
  }

  sessionDurationLabel(sessionLength: SessionLength): string {
    if (sessionLength.minutes % 1440 === 0) {
      return `${sessionLength.minutes / 1440} ${this.i18n.t('dayShort')}`;
    }

    if (sessionLength.minutes % 60 === 0) {
      return `${sessionLength.minutes / 60} ${this.i18n.t('hourShort')}`;
    }

    return `${sessionLength.minutes} ${this.i18n.t('minutesShort')}`;
  }

  readonly petOption = petOption;

  moodLabel(mood: PetMood): string {
    return this.i18n.t(petMoodKey(mood));
  }

  statusLabel(status: PetStatus): string {
    return this.i18n.t(petStatusKey(status));
  }

  periodOfLifeLabel(periodOfLife: PetPeriodOfLife): string {
    return this.i18n.t(petPeriodOfLifeKey(periodOfLife));
  }

  statLabel(statId: PetStatId): string {
    return this.i18n.t(petStatKey(statId));
  }

  careActionLabel(actionId: PetCareActionId, pet: OwnedPet | null = null): string {
    if (actionId === 'toggleLight' && pet) {
      return pet.isLightOn ? this.i18n.t('turnLightOff') : this.i18n.t('turnLightOn');
    }

    return this.i18n.t(petCareActionKey(actionId));
  }

  careActionHint(actionId: PetCareActionId): string {
    return this.i18n.t(petCareActionHintKey(actionId));
  }

  farewellReasonLabel(reason: PetFarewellReason): string {
    return this.i18n.t(petFarewellReasonKey(reason));
  }

  farewellPhraseLabel(phraseId: PetFarewellPhraseId): string {
    return this.i18n.t(petFarewellPhraseKey(phraseId));
  }

  statValue(pet: OwnedPet, statId: PetStatId): number {
    return Math.round(pet.stats[statId]);
  }

  isCareActionDisabled(pet: OwnedPet, actionId: PetCareActionId): boolean {
    return careActionFailureReason(pet, actionId, this.now()) !== null;
  }

  careActionState(pet: OwnedPet, actionId: PetCareActionId): string {
    const reason = careActionFailureReason(pet, actionId, this.now());

    if (reason === 'inactive') {
      return this.i18n.t('careActionInactive');
    }

    if (reason === 'away') {
      return `${this.i18n.t('careActionAway')}: ${this.formatRemaining(petAwayRemainingMs(pet, this.now()))}`;
    }

    if (reason === 'sleeping') {
      return this.i18n.t('careActionSleeping');
    }

    if (reason === 'cooldown') {
      return `${this.i18n.t('careCooldown')}: ${this.formatRemaining(careActionCooldownRemainingMs(pet, actionId, this.now()))}`;
    }

    return this.i18n.t('careActionReady');
  }

  lightLabel(pet: OwnedPet): string {
    return pet.isLightOn ? this.i18n.t('petLightOn') : this.i18n.t('petLightOff');
  }

  awayUntilLabel(pet: OwnedPet): string | null {
    return petAwayRemainingMs(pet, this.now()) > 0 && pet.awayUntil ? this.formatDate(pet.awayUntil) : null;
  }

  petAgeLabel(pet: OwnedPet): string {
    const ms = Date.now() - Date.parse(pet.createdAt);
    const minutes = Math.floor(ms / 60000);
    if (minutes >= 1440) {
      return `${Math.floor(minutes / 1440)} ${this.i18n.t('dayShort')}`;
    }
    if (minutes >= 60) {
      return `${Math.floor(minutes / 60)} ${this.i18n.t('hourShort')}`;
    }
    return `${minutes} ${this.i18n.t('minutesShort')}`;
  }

  formatDate(value: string): string {
    return new Intl.DateTimeFormat(this.i18n.language(), {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(value));
  }

  private formatRemaining(ms: number): string {
    const minutes = Math.max(1, Math.ceil(ms / 60000));

    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const restMinutes = minutes % 60;

      if (restMinutes === 0) {
        return `${hours} ${this.i18n.t('hourShort')}`;
      }

      return `${hours} ${this.i18n.t('hourShort')} ${restMinutes} ${this.i18n.t('minutesShort')}`;
    }

    return `${minutes} ${this.i18n.t('minutesShort')}`;
  }
}
