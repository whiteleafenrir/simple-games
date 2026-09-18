import { Component, computed, effect, inject, signal, untracked, ChangeDetectionStrategy } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';

import { TranslationKey } from '../i18n/translations';
import { petErrorKey } from '../pets/pet-error.utils';
import { I18nService } from '../i18n/i18n.service';
import { PetStatsComponent } from '../pets/pet-stats.component';
import { PetDatePipe } from '../pets/pet-date.pipe';
import {
  OwnedPet,
  PetCareActionEntry,
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
  petCareActionKey,
  petFarewellPhraseKey,
  petFarewellReasonKey,
  petMoodKey,
  petOption,
  petPeriodOfLifeKey,
  petStatKey,
  petStatusKey,
  sessionLength
} from '../pets/pet-display.utils';
import { PetStorageService } from '../pets/pet-storage.service';

@Component({
  selector: 'app-pet-profile',
  imports: [
    RouterLink,
    PetStatsComponent,
    PetDatePipe
  ],
  templateUrl: './pet-profile.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./pet-profile.component.css']
})
export class PetProfileComponent {
  public readonly i18n = inject(I18nService);
  private readonly route = inject(ActivatedRoute);
  public readonly pets = inject(PetStorageService);
  private readonly petId = toSignal(
    this.route.paramMap.pipe(map((paramMap) => paramMap.get('petId'))),
    { initialValue: this.route.snapshot.paramMap.get('petId') }
  );

  readonly pet = computed((): OwnedPet | null => this.pets.petById(this.petId()));
  readonly statIds: readonly PetStatId[] = PET_STAT_IDS;

  readonly historyEntries = signal<PetCareActionEntry[]>([]);
  readonly historyLoading = signal(false);
  readonly historyError = signal<TranslationKey | null>(null);
  readonly historyCursor = signal<string | null>(null);
  private historyRequest = 0;
  private readonly historyVersion = computed(() => {
    const pet = this.pet();
    return pet ? pet.id + ':' + pet.careHistoryCount : null;
  });

  constructor() {
    effect(onCleanup => {
      this.historyVersion();
      onCleanup(() => { this.historyRequest++; });
      untracked(() => {
        this.historyEntries.set([]); this.historyCursor.set(null); this.historyError.set(null); this.historyLoading.set(false);
        if (this.pet()) void this.loadHistory();
      });
    });
  }

  async loadHistory(): Promise<void> {
    const pet = this.pet();
    if (!pet || this.historyLoading()) return;
    const request = ++this.historyRequest;
    const cursor = this.historyCursor();
    this.historyLoading.set(true);
    this.historyError.set(null);
    try {
      const page = await this.pets.getHistory(pet.id, cursor);
      if (request !== this.historyRequest) return;
      this.historyEntries.update(entries => [...new Map([...entries, ...page.items].map(entry => [entry.id, entry])).values()]);
      this.historyCursor.set(page.nextCursor);
    } catch (error) {
      if (request === this.historyRequest) this.historyError.set(petErrorKey(error));
    } finally {
      if (request === this.historyRequest) this.historyLoading.set(false);
    }
  }

  readonly petOption = petOption;
  readonly sessionLength = sessionLength;

  statusLabel(status: PetStatus): string {
    return this.i18n.t(petStatusKey(status));
  }

  moodLabel(mood: PetMood): string {
    return this.i18n.t(petMoodKey(mood));
  }

  periodOfLifeLabel(periodOfLife: PetPeriodOfLife): string {
    return this.i18n.t(petPeriodOfLifeKey(periodOfLife));
  }

  statLabel(statId: PetStatId): string {
    return this.i18n.t(petStatKey(statId));
  }

  lightLabel(pet: OwnedPet): string {
    return pet.isLightOn ? this.i18n.t('petLightOn') : this.i18n.t('petLightOff');
  }

  farewellReasonLabel(reason: PetFarewellReason): string {
    return this.i18n.t(petFarewellReasonKey(reason));
  }

  farewellPhraseLabel(phraseId: PetFarewellPhraseId): string {
    return this.i18n.t(petFarewellPhraseKey(phraseId));
  }

  careActionLabel(actionId: PetCareActionId): string {
    return this.i18n.t(petCareActionKey(actionId));
  }

  statDelta(entry: PetCareActionEntry, statId: PetStatId): string {
    return this.formatSigned(entry.statsAfter[statId] - entry.statsBefore[statId]);
  }

  scoreDelta(entry: PetCareActionEntry): string {
    return this.formatSigned(entry.careScoreAfter - entry.careScoreBefore);
  }

  lightChangeLabel(entry: PetCareActionEntry): string | null {
    if (entry.isLightOnBefore === entry.isLightOnAfter) {
      return null;
    }

    const before = entry.isLightOnBefore ? this.i18n.t('petLightOn') : this.i18n.t('petLightOff');
    const after = entry.isLightOnAfter ? this.i18n.t('petLightOn') : this.i18n.t('petLightOff');
    return `${this.i18n.t('petLight')}: ${before} -> ${after}`;
  }


  private formatSigned(value: number): string {
    const rounded = Math.round(value * 10) / 10;
    return `${rounded > 0 ? '+' : ''}${rounded}`;
  }

}
