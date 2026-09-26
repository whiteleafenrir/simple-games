import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { PetCareActionId, PetMood } from './owned-pet.model';
import { TranslationKey } from '../i18n/translations';

export type PetReactionKind = 'joy' | 'content' | 'clean' | 'wake' | 'thoughtful';
export const PET_REACTIONS: Record<PetReactionKind, { mood: PetMood; duration: number; label: TranslationKey }> = {
  joy: { mood: 'joyful', duration: 5200, label: 'reactionJoy' },
  content: { mood: 'joyful', duration: 4000, label: 'reactionContent' },
  clean: { mood: 'neutral', duration: 4000, label: 'reactionClean' },
  wake: { mood: 'neutral', duration: 3000, label: 'reactionWake' },
  thoughtful: { mood: 'thoughtful', duration: 5500, label: 'reactionThoughtful' }
};
export const CARE_REACTIONS: Partial<Record<PetCareActionId, PetReactionKind>> = {
  play: 'joy', feed: 'content', junkFood: 'content', clean: 'clean', toggleLight: 'wake'
};

/** Local, ephemeral feedback for confirmed commands; never inferred from polling. */
@Injectable({ providedIn: 'root' })
export class PetReactionService {
  readonly current = signal<{ petId: string; kind: PetReactionKind; sequence: number } | null>(null);
  private timer: ReturnType<typeof setTimeout> | undefined;
  private sequence = 0;
  constructor() { inject(DestroyRef).onDestroy(() => this.clear()); }
  play(petId: string, kind: PetReactionKind): void {
    this.clear();
    this.current.set({ petId, kind, sequence: ++this.sequence });
    this.timer = setTimeout(() => this.current.set(null), PET_REACTIONS[kind].duration);
  }
  clear(): void { clearTimeout(this.timer); this.current.set(null); }
}
